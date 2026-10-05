import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClaudeAdapter } from './adapters/claude';
import { CodexAdapter } from './adapters/codex';
import { CursorAdapter } from './adapters/cursor';
import { GrokAdapter } from './adapters/grok';
import { writeConfig, type ServerCommand } from './install';
import { applyActions, newArchiveBatch, planCopy, planRetirement, planSkills, planWrite, type FileAction } from './assets';

export interface InstallContext {
  base: string;
  source: string;
  global: boolean;
  server: ServerCommand;
}

export interface AgentInstallPlan {
  name: string;
  path: string;
  content: string;
  assets: FileAction[];
}

export type InstallAsset =
  | { kind: 'skills'; destination: string }
  | { kind: 'rule'; destination: string; filename: string; render(source: string): string };

// Adapters declare where an agent keeps MCP config, skills, and rules.
// The manifest runs the same plan, write, and asset steps for every adapter.
export interface AgentAdapter {
  readonly name: string;
  readonly label?: string;
  detected(base: string, global: boolean): boolean;
  configPath(base: string, global: boolean): string;
  mergeConfig(filePath: string, server: ServerCommand): string;
  assets(context: InstallContext): InstallAsset[];
}

// plan() only reads. write() and installAssets() run after every selected
// agent has been planned, so one bad config leaves every installation file unchanged.
export class Manifest {
  constructor(private readonly adapter: AgentAdapter) {}

  get name(): string {
    return this.adapter.name;
  }

  get label(): string {
    return this.adapter.label ?? this.adapter.name;
  }

  detected(base: string, global: boolean): boolean {
    return this.adapter.detected(base, global);
  }

  plan(context: InstallContext, batch = newArchiveBatch(context.base)): AgentInstallPlan {
    const path = this.adapter.configPath(context.base, context.global);
    const content = this.adapter.mergeConfig(path, context.server);
    planWrite(path, content);
    return { name: this.name, path, content, assets: this.planAssets(context, batch) };
  }

  write(plan: AgentInstallPlan): void {
    writeConfig(plan.path, plan.content);
  }

  installAssets(context: InstallContext): void {
    applyActions(this.planAssets(context, newArchiveBatch(context.base)));
  }

  private planAssets(context: InstallContext, batch: string): FileAction[] {
    return this.adapter.assets(context).flatMap((asset) => this.planAsset(context, asset, batch));
  }

  private planAsset(context: InstallContext, asset: InstallAsset, batch: string): FileAction[] {
    if (asset.kind === 'skills') {
      return [
        ...planRetirement(asset.destination, batch, this.name),
        ...planSkills(join(context.source, 'skills'), asset.destination),
      ];
    }
    const rules = join(context.source, 'rules/AGENTS.md');
    if (!existsSync(rules)) return [];
    return [planWrite(join(asset.destination, asset.filename), asset.render(readFileSync(rules, 'utf8')))];
  }
}

export interface InstallationPlan {
  agents: { manifest: Manifest; plan: AgentInstallPlan }[];
  actions: FileAction[];
}

// All configurations, copies, and archives are validated before the caller mutates.
export function planInstallation(context: InstallContext, selected: Manifest[]): InstallationPlan {
  for (const skill of ['di-framework', 'principled-engineering']) {
    const entrypoint = join(context.source, 'skills', skill, 'SKILL.md');
    if (!existsSync(entrypoint)) throw new Error(`Bundled skill entrypoint is missing: ${entrypoint}`);
    readFileSync(entrypoint, 'utf8');
  }
  const batch = newArchiveBatch(context.base);
  const agents = selected.map((manifest) => ({ manifest, plan: manifest.plan(context, batch) }));
  const runtime = join(context.base, '.di-framework/plugin');
  const actions: FileAction[] = [
    ...planRetirement(join(runtime, 'skills'), batch, 'runtime'),
    ...['dist', 'package.json', 'rules'].flatMap((item) => planCopy(join(context.source, item), join(runtime, item))),
    ...planSkills(join(context.source, 'skills'), join(runtime, 'skills')),
    ...agents.flatMap(({ plan }) => plan.assets),
  ];
  return { agents, actions };
}

export const agentManifests: Manifest[] = [
  new Manifest(new CursorAdapter()),
  new Manifest(new ClaudeAdapter()),
  new Manifest(new CodexAdapter()),
  new Manifest(new GrokAdapter()),
];

function installerList(): string {
  return agentManifests.map((manifest) => manifest.label).join(', ');
}

export function agentOptionHelp(): string {
  return `${installerList()}, all, auto (default)`;
}

export function assertKnownAgent(agent: string): void {
  const name = agent.toLowerCase();
  const known = name === 'all' || name === 'auto' || agentManifests.some((manifest) => manifest.name === name);
  if (!known) throw new Error(`Unsupported agent: ${name}. Supported installers: ${installerList()}.`);
}

export function selectManifests(agent: string, base: string, global: boolean): Manifest[] {
  assertKnownAgent(agent);
  const name = agent.toLowerCase();
  const selected = agentManifests.filter((manifest) => name === 'all' || manifest.name === name || (name === 'auto' && manifest.detected(base, global)));
  if (!selected.length) {
    const choices = agentManifests.map((manifest) => `--agent ${manifest.name}`);
    const last = choices.pop();
    throw new Error(`No supported agent detected. Choose ${choices.join(', ')}, or ${last}.`);
  }
  return selected;
}
