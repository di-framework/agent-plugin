import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Manifest, type InstallContext } from '../manifest';
import { GrokAdapter } from './grok';

const server = { command: 'node', args: ['/persistent/cli.js', 'serve'] };

function withDir(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'di-grok-'));
  try { run(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
function sourceTree(dir: string): string {
  const source = join(dir, 'source');
  mkdirSync(join(source, 'skills/di-framework'), { recursive: true });
  writeFileSync(join(source, 'skills/di-framework/SKILL.md'), 'demo skill\n');
  mkdirSync(join(source, 'rules'), { recursive: true });
  writeFileSync(join(source, 'rules/AGENTS.md'), 'di-framework workflow\n');
  return source;
}
function context(base: string, source: string, global = false): InstallContext {
  return { base, source, global, server };
}

describe('Grok manifest', () => {
  const manifest = new Manifest(new GrokAdapter());

  test('detects .grok or its config file', () => withDir((dir) => {
    expect(manifest.detected(dir, false)).toBe(false);
    mkdirSync(join(dir, '.grok'));
    expect(manifest.detected(dir, false)).toBe(true);
    expect(manifest.detected(dir, true)).toBe(true);
  }));

  test('installs config, skills, and rules', () => withDir((dir) => {
    const source = sourceTree(dir);
    const base = join(dir, 'project');
    mkdirSync(join(base, '.grok/rules'), { recursive: true });
    writeFileSync(join(base, '.grok/config.toml'), '# keep\n[mcp_servers.other]\ncommand = "other"\n');
    writeFileSync(join(base, '.grok/rules/keep.md'), 'keep\n');
    const plan = manifest.plan(context(base, source));
    expect(plan.path).toBe(join(base, '.grok/config.toml'));
    expect(existsSync(join(base, '.grok/skills'))).toBe(false);
    manifest.write(plan);
    manifest.installAssets(context(base, source));
    const written = readFileSync(plan.path, 'utf8');
    expect(written).toBe(plan.content);
    expect(written).toContain('# keep\n');
    expect(written).toContain('[mcp_servers.other]\ncommand = "other"\n');
    expect(written).toContain(`[mcp_servers.di-framework]\ncommand = ${JSON.stringify(server.command)}\nargs = ${JSON.stringify(server.args)}\n`);
    expect(readFileSync(join(base, '.grok/skills/di-framework/SKILL.md'), 'utf8')).toBe('demo skill\n');
    expect(readFileSync(join(base, '.grok/rules/di-framework.md'), 'utf8')).toBe('di-framework workflow\n');
    expect(readFileSync(join(base, '.grok/rules/keep.md'), 'utf8')).toBe('keep\n');
    expect(manifest.plan(context(base, source)).content).toBe(plan.content);
  }));

  test('global install uses the same paths under the home directory', () => withDir((dir) => {
    const source = sourceTree(dir);
    const plan = manifest.plan(context(dir, source, true));
    expect(plan.path).toBe(join(dir, '.grok/config.toml'));
    manifest.write(plan);
    manifest.installAssets(context(dir, source, true));
    expect(existsSync(join(dir, '.grok/skills/di-framework/SKILL.md'))).toBe(true);
    expect(readFileSync(join(dir, '.grok/rules/di-framework.md'), 'utf8')).toBe('di-framework workflow\n');
  }));
});
