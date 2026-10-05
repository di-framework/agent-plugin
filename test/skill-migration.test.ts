import { describe, expect, test } from 'bun:test';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { applyActions, newArchiveBatch, planRetirement, retiredFrameworkSkills } from '../bin/assets';
import { planInstallation, selectManifests, type InstallContext } from '../bin/manifest';

const destinations = { cursor: '.cursor/skills', claude: '.claude/skills', codex: '.agents/skills', grok: '.grok/skills' };
const server = { command: 'node', args: ['/persistent/cli.js', 'serve'] };
function put(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
function fixture(run: (context: InstallContext) => void) {
  const directory = mkdtempSync(join(tmpdir(), 'di-migration-'));
  const source = join(directory, 'source');
  const base = join(directory, 'workspace');
  mkdirSync(base);
  for (const skill of ['di-framework', 'principled-engineering']) {
    put(join(source, 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\ndescription: fixture\n---\n`);
    put(join(source, 'skills', skill, 'references/nested/resource.md'), `resource for ${skill}\n`);
  }
  put(join(source, 'skills/di-framework/scripts/run'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(source, 'skills/di-framework/scripts/run'), 0o755);
  put(join(source, 'rules/AGENTS.md'), 'di-framework workflow\n');
  put(join(source, 'dist/bin/cli.js'), '// fixture\n');
  put(join(source, 'package.json'), '{}');
  try { run({ base, source, global: false, server }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}
function legacy(root: string, skill = 'di-framework-api') {
  put(join(root, skill, 'SKILL.md'), 'user-edited legacy entry\n');
  put(join(root, skill, '.hidden/nested.bin'), '\0edited resource\n');
  put(join(root, skill, 'run'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(root, skill, 'run'), 0o751);
  symlinkSync('SKILL.md', join(root, skill, 'link'));
}
function snapshot(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(directory: string, prefix = '') {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const key = join(prefix, name);
      const info = lstatSync(path);
      result[key] = info.isSymbolicLink() ? `link:${readlinkSync(path)}` : info.isDirectory() ? 'directory' : `${info.mode & 0o777}:${readFileSync(path).toString('base64')}`;
      if (info.isDirectory()) walk(path, key);
    }
  }
  walk(root);
  return result;
}
function apply(context: InstallContext, agent = 'all') {
  const plan = planInstallation(context, selectManifests(agent, context.base, context.global));
  applyActions(plan.actions);
  for (const { manifest, plan: agentPlan } of plan.agents) manifest.write(agentPlan);
  return plan;
}

describe('framework skill retirement', () => {
  test('archives complete edited folders for runtime and every selected destination', () => fixture((context) => {
    const roots = { runtime: '.di-framework/plugin/skills', ...destinations };
    const expected: Record<string, Record<string, string>> = {};
    for (const [target, directory] of Object.entries(roots)) {
      const root = join(context.base, directory);
      for (const skill of retiredFrameworkSkills) legacy(root, skill);
      expected[target] = snapshot(join(root, 'di-framework-api'));
      put(join(root, 'di-framework-api-custom/SKILL.md'), 'custom stays\n');
      put(join(root, 'unrelated/SKILL.md'), 'unrelated stays\n');
    }
    const plan = apply(context);
    const archives = plan.actions.filter((action) => action.kind === 'archive');
    expect(archives).toHaveLength(26 * 5);
    expect(readdirSync(join(context.base, '.di-framework/skill-archives'))).toHaveLength(1);
    for (const [target, directory] of Object.entries(roots)) {
      const root = join(context.base, directory);
      for (const skill of retiredFrameworkSkills) {
        expect(existsSync(join(root, skill))).toBe(false);
        const archive = archives.find((action) => action.destination.endsWith(join(target, skill)))!;
        expect(snapshot(archive.destination)).toEqual(expected[target]);
      }
      expect(readFileSync(join(root, 'di-framework-api-custom/SKILL.md'), 'utf8')).toBe('custom stays\n');
      expect(readFileSync(join(root, 'unrelated/SKILL.md'), 'utf8')).toBe('unrelated stays\n');
      for (const skill of ['di-framework', 'principled-engineering']) {
        expect(readFileSync(join(root, skill, 'references/nested/resource.md'), 'utf8')).toBe(`resource for ${skill}\n`);
      }
      expect(lstatSync(join(root, 'di-framework/scripts/run')).mode & 0o777).toBe(0o755);
    }
  }));

  test('planning previews archives and resources without mutation', () => fixture((context) => {
    legacy(join(context.base, '.claude/skills'));
    const before = snapshot(context.base);
    const plan = planInstallation(context, selectManifests('all', context.base, false));
    expect(plan.actions.some((action) => action.kind === 'archive')).toBe(true);
    expect(plan.actions.some((action) => action.destination.includes('principled-engineering'))).toBe(true);
    expect(snapshot(context.base)).toEqual(before);
    expect(existsSync(join(context.base, '.di-framework'))).toBe(false);
  }));

  test('invalid last-agent config leaves runtime, archives, earlier configs, and skills unchanged', () => fixture((context) => {
    legacy(join(context.base, '.di-framework/plugin/skills'));
    legacy(join(context.base, '.cursor/skills'));
    put(join(context.base, '.cursor/mcp.json'), '{"mcpServers":{"other":{"command":"keep"}}}');
    put(join(context.base, '.grok/config.toml'), '[broken\n');
    const before = snapshot(context.base);
    expect(() => planInstallation(context, selectManifests('all', context.base, false))).toThrow('invalid TOML');
    expect(snapshot(context.base)).toEqual(before);
  }));

  test('invalid asset destinations abort before any archives or configurations', () => fixture((context) => {
    legacy(join(context.base, '.cursor/skills'));
    put(join(context.base, '.grok/skills'), 'a file cannot hold skills');
    const before = snapshot(context.base);
    expect(() => planInstallation(context, selectManifests('all', context.base, false))).toThrow('Invalid installation destination');
    expect(snapshot(context.base)).toEqual(before);
  }));

  test('copies are validated deeply before writes', () => fixture((context) => {
    legacy(join(context.base, '.cursor/skills'));
    put(join(context.base, '.grok/skills/di-framework/references/nested/resource.md/blocked'), 'directory where file belongs');
    const before = snapshot(context.base);
    expect(() => planInstallation(context, selectManifests('all', context.base, false))).toThrow('Invalid installation destination');
    expect(snapshot(context.base)).toEqual(before);
  }));

  test('missing bundled entrypoints cannot retire existing skills', () => fixture((context) => {
    legacy(join(context.base, '.cursor/skills'));
    rmSync(join(context.source, 'skills/principled-engineering/SKILL.md'));
    const before = snapshot(context.base);
    expect(() => planInstallation(context, selectManifests('all', context.base, false))).toThrow('Bundled skill entrypoint is missing');
    expect(snapshot(context.base)).toEqual(before);
  }));

  test.skipIf(process.getuid?.() === 0)('unreadable source resources fail before migration', () => fixture((context) => {
    legacy(join(context.base, '.cursor/skills'));
    const resource = join(context.source, 'skills/di-framework/references/nested/resource.md');
    chmodSync(resource, 0o000);
    const before = snapshot(context.base);
    try {
      expect(() => planInstallation(context, selectManifests('all', context.base, false))).toThrow();
      expect(snapshot(context.base)).toEqual(before);
    } finally { chmodSync(resource, 0o644); }
  }));

  test('aliased durable source paths do not trigger a self copy', () => fixture((context) => {
    apply(context);
    const runtime = join(context.base, '.di-framework/plugin');
    const alias = join(context.base, 'runtime-alias');
    symlinkSync(runtime, alias);
    const plan = apply({ ...context, source: alias });
    expect(plan.actions.filter((action) => action.kind === 'copy').every((action) => !action.destination.startsWith(runtime))).toBe(true);
    expect(existsSync(join(context.base, '.cursor/skills/di-framework/SKILL.md'))).toBe(true);
  }));

  test('runtime updates exclude retired source folders and tolerate source equality', () => fixture((context) => {
    apply(context);
    const runtimeContext = { ...context, source: join(context.base, '.di-framework/plugin') };
    legacy(join(runtimeContext.source, 'skills'));
    rmSync(join(context.base, '.cursor/skills/di-framework'), { recursive: true });
    const plan = apply(runtimeContext);
    expect(plan.actions.filter((action) => action.kind === 'copy').every((action) => !action.destination.startsWith(runtimeContext.source))).toBe(true);
    expect(existsSync(join(context.base, '.cursor/skills/di-framework/SKILL.md'))).toBe(true);
    expect(existsSync(join(context.base, '.cursor/skills/di-framework-api'))).toBe(false);
    const before = snapshot(join(context.base, '.di-framework/skill-archives'));
    expect(apply(runtimeContext).actions.filter((action) => action.kind === 'archive')).toHaveLength(0);
    expect(snapshot(join(context.base, '.di-framework/skill-archives'))).toEqual(before);
    legacy(join(context.base, '.cursor/skills'));
    apply(runtimeContext);
    expect(readdirSync(join(context.base, '.di-framework/skill-archives'))).toHaveLength(2);
  }));

  test('durable updates distribute plugin skills without overwriting or spreading user skills', () => fixture((context) => {
    apply(context);
    const runtime = join(context.base, '.di-framework/plugin');
    put(join(runtime, 'skills/di-framework-api-custom/SKILL.md'), 'runtime custom\n');
    put(join(runtime, 'skills/unrelated/SKILL.md'), 'runtime unrelated\n');
    for (const destination of Object.values(destinations)) {
      put(join(context.base, destination, 'di-framework-api-custom/SKILL.md'), `custom for ${destination}\n`);
    }
    apply({ ...context, source: runtime });
    for (const destination of Object.values(destinations)) {
      expect(readFileSync(join(context.base, destination, 'di-framework-api-custom/SKILL.md'), 'utf8')).toBe(`custom for ${destination}\n`);
      expect(existsSync(join(context.base, destination, 'unrelated'))).toBe(false);
    }
    expect(readFileSync(join(runtime, 'skills/unrelated/SKILL.md'), 'utf8')).toBe('runtime unrelated\n');
    expect(readFileSync(join(runtime, 'skills/di-framework-api-custom/SKILL.md'), 'utf8')).toBe('runtime custom\n');
  }));

  test('selected/global install preserves unselected agent legacy skills', () => fixture((context) => {
    for (const destination of Object.values(destinations)) legacy(join(context.base, destination));
    apply({ ...context, global: true }, 'cursor');
    expect(existsSync(join(context.base, '.cursor/skills/di-framework-api'))).toBe(false);
    expect(existsSync(join(context.base, '.cursor/skills/principled-engineering/SKILL.md'))).toBe(true);
    expect(existsSync(join(context.base, '.cursor/rules'))).toBe(false);
    for (const destination of [destinations.claude, destinations.codex, destinations.grok]) {
      expect(existsSync(join(context.base, destination, 'di-framework-api/SKILL.md'))).toBe(true);
    }
  }));

  test('does not overwrite a previous archive or merge into an occupied batch', () => fixture((context) => {
    const root = join(context.base, '.cursor/skills');
    legacy(root);
    const batch = newArchiveBatch(context.base);
    const actions = planRetirement(root, batch, 'cursor');
    put(join(batch, 'previous.txt'), 'do not overwrite');
    const before = snapshot(context.base);
    expect(() => applyActions(actions)).toThrow();
    expect(snapshot(context.base)).toEqual(before);
    put(join(batch, 'cursor/di-framework-api/SKILL.md'), 'previous archive');
    expect(() => planRetirement(root, batch, 'cursor')).toThrow('Archive destination already exists');
    expect(readFileSync(join(batch, 'cursor/di-framework-api/SKILL.md'), 'utf8')).toBe('previous archive');
  }));

  test('fresh and repeated installs do not create empty archive batches', () => fixture((context) => {
    apply(context);
    apply(context);
    expect(existsSync(join(context.base, '.di-framework/skill-archives'))).toBe(false);
  }));
});
