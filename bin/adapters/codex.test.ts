import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Manifest, type InstallContext } from '../manifest';
import { CodexAdapter } from './codex';

const server = { command: 'node', args: ['/persistent/cli.js', 'serve'] };

function withDir(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'di-codex-'));
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

describe('Codex manifest', () => {
  const manifest = new Manifest(new CodexAdapter());

  test('detects .codex or its config file', () => withDir((dir) => {
    expect(manifest.detected(dir, false)).toBe(false);
    mkdirSync(join(dir, '.codex'), { recursive: true });
    writeFileSync(join(dir, '.codex/config.toml'), '');
    expect(manifest.detected(dir, false)).toBe(true);
    expect(manifest.detected(dir, true)).toBe(true);
  }));

  test('installs config and skills', () => withDir((dir) => {
    const source = sourceTree(dir);
    const base = join(dir, 'project');
    mkdirSync(join(base, '.codex'), { recursive: true });
    writeFileSync(join(base, '.codex/config.toml'), '# keep\n[mcp_servers.other]\ncommand = "other"\n');
    const plan = manifest.plan(context(base, source));
    expect(plan.path).toBe(join(base, '.codex/config.toml'));
    manifest.write(plan);
    manifest.installAssets(context(base, source));
    const written = readFileSync(plan.path, 'utf8');
    expect(written).toBe(plan.content);
    expect(written).toContain('# keep\n');
    expect(written).toContain('[mcp_servers.other]\ncommand = "other"\n');
    expect(written).toContain(`[mcp_servers.di-framework]\ncommand = ${JSON.stringify(server.command)}\nargs = ${JSON.stringify(server.args)}\n`);
    expect(readFileSync(join(base, '.agents/skills/di-framework/SKILL.md'), 'utf8')).toBe('demo skill\n');
    expect(existsSync(join(base, '.agents/rules'))).toBe(false);
    expect(manifest.plan(context(base, source)).content).toBe(plan.content);
  }));
});
