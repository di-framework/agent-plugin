import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Manifest, type InstallContext } from '../manifest';
import { ClaudeAdapter } from './claude';

const server = { command: 'node', args: ['/persistent/cli.js', 'serve'] };

function withDir(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'di-claude-'));
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

describe('Claude Code manifest', () => {
  const manifest = new Manifest(new ClaudeAdapter());

  test('detects the project directory or project config', () => withDir((dir) => {
    expect(manifest.detected(dir, false)).toBe(false);
    writeFileSync(join(dir, '.mcp.json'), '{}\n');
    expect(manifest.detected(dir, false)).toBe(true);
    expect(manifest.detected(dir, true)).toBe(false);
    mkdirSync(join(dir, '.claude'));
    expect(manifest.detected(dir, true)).toBe(true);
  }));

  test('detects the user config', () => withDir((dir) => {
    writeFileSync(join(dir, '.claude.json'), '{}\n');
    expect(manifest.detected(dir, true)).toBe(true);
  }));

  test('installs project config and skills', () => withDir((dir) => {
    const source = sourceTree(dir);
    const base = join(dir, 'project');
    mkdirSync(base);
    const plan = manifest.plan(context(base, source));
    expect(plan.path).toBe(join(base, '.mcp.json'));
    expect(existsSync(plan.path)).toBe(false);
    manifest.write(plan);
    manifest.installAssets(context(base, source));
    expect(JSON.parse(readFileSync(plan.path, 'utf8')).mcpServers['di-framework']).toEqual(server);
    expect(readFileSync(join(base, '.claude/skills/di-framework/SKILL.md'), 'utf8')).toBe('demo skill\n');
    expect(existsSync(join(base, '.claude/rules'))).toBe(false);
    expect(manifest.plan(context(base, source)).content).toBe(plan.content);
  }));

  test('global install uses ~/.claude.json and still copies skills', () => withDir((dir) => {
    const source = sourceTree(dir);
    const plan = manifest.plan(context(dir, source, true));
    expect(plan.path).toBe(join(dir, '.claude.json'));
    manifest.write(plan);
    manifest.installAssets(context(dir, source, true));
    expect(JSON.parse(readFileSync(plan.path, 'utf8')).mcpServers['di-framework']).toEqual(server);
    expect(existsSync(join(dir, '.claude/skills/di-framework/SKILL.md'))).toBe(true);
  }));
});
