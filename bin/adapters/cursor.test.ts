import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Manifest, type InstallContext } from '../manifest';
import { CursorAdapter } from './cursor';

const server = { command: 'node', args: ['/persistent/cli.js', 'serve'] };
const rules = `---\ndescription: di-framework workflow\nglobs: *\nalwaysApply: true\n---\n\ndi-framework workflow\n`;

function withDir(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'di-cursor-'));
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

describe('Cursor manifest', () => {
  const manifest = new Manifest(new CursorAdapter());

  test('detects .cursor or .cursorrules', () => withDir((dir) => {
    expect(manifest.detected(dir, false)).toBe(false);
    writeFileSync(join(dir, '.cursorrules'), '');
    expect(manifest.detected(dir, false)).toBe(true);
    rmSync(join(dir, '.cursorrules'));
    mkdirSync(join(dir, '.cursor'));
    expect(manifest.detected(dir, true)).toBe(true);
  }));

  test('installs project config and rules', () => withDir((dir) => {
    const source = sourceTree(dir);
    const base = join(dir, 'project');
    mkdirSync(base);
    const plan = manifest.plan(context(base, source));
    expect(plan.path).toBe(join(base, '.cursor/mcp.json'));
    expect(existsSync(plan.path)).toBe(false);
    manifest.write(plan);
    manifest.installAssets(context(base, source));
    expect(JSON.parse(readFileSync(plan.path, 'utf8')).mcpServers['di-framework']).toEqual(server);
    expect(readFileSync(join(base, '.cursor/rules/di-framework.mdc'), 'utf8')).toBe(rules);
    expect(readFileSync(join(base, '.cursor/skills/di-framework/SKILL.md'), 'utf8')).toBe('demo skill\n');
    expect(manifest.plan(context(base, source)).content).toBe(plan.content);
  }));

  test('global install skips rules', () => withDir((dir) => {
    const source = sourceTree(dir);
    const plan = manifest.plan(context(dir, source, true));
    expect(plan.path).toBe(join(dir, '.cursor/mcp.json'));
    manifest.write(plan);
    manifest.installAssets(context(dir, source, true));
    expect(existsSync(plan.path)).toBe(true);
    expect(existsSync(join(dir, '.cursor/rules'))).toBe(false);
    expect(existsSync(join(dir, '.cursor/skills/di-framework/SKILL.md'))).toBe(true);
  }));

  test('skips rules when AGENTS.md is missing', () => withDir((dir) => {
    const source = join(dir, 'source');
    mkdirSync(source);
    manifest.installAssets(context(dir, source));
    expect(existsSync(join(dir, '.cursor/rules'))).toBe(false);
  }));
});
