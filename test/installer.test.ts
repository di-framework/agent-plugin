import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, chmodSync, existsSync, symlinkSync, readlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergedCodexConfig, mergedGrokConfig, mergedMcpConfig, writeConfig, type ServerCommand } from '../bin/install';
import { agentOptionHelp, Manifest, selectManifests, type AgentAdapter, type InstallAsset, type InstallContext } from '../bin/manifest';

const server = { command: 'node', args: ['/persistent/cli.js', 'serve'] };
function fixture(run: (dir: string, file: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'di-installer-'));
  try { run(dir, join(dir, 'mcp.json')); } finally { rmSync(dir, { recursive: true, force: true }); }
}
describe('MCP configuration preservation', () => {
  test('preserves unrelated settings and registrations, and updates idempotently', () => fixture((_dir, file) => {
    writeFileSync(file, JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'other' } } }));
    const content = mergedMcpConfig(file, server);
    writeConfig(file, content);
    expect(JSON.parse(content)).toEqual({ theme: 'dark', mcpServers: { other: { command: 'other' }, 'di-framework': server } });
    expect(mergedMcpConfig(file, server)).toBe(content);
  }));
  for (const invalid of ['{broken', 'null', '[]', '{"mcpServers":[]}']) {
    test(`rejects invalid configuration ${invalid} without changing it`, () => fixture((_dir, file) => {
      writeFileSync(file, invalid);
      expect(() => mergedMcpConfig(file, server)).toThrow('the file was not changed');
      expect(readFileSync(file, 'utf8')).toBe(invalid);
    }));
  }
  test('rejects unreadable config without replacing it', () => fixture((_dir, file) => {
    mkdirSync(file);
    expect(() => mergedMcpConfig(file, server)).toThrow('Cannot read MCP configuration');
    expect(existsSync(file)).toBe(true);
  }));
  test.skipIf(process.getuid?.() === 0)('rejects permission-denied config unchanged', () => fixture((_dir, file) => {
    writeFileSync(file, '{}');
    chmodSync(file, 0o000);
    try { expect(() => mergedMcpConfig(file, server)).toThrow('Cannot read MCP configuration'); }
    finally { chmodSync(file, 0o600); }
    expect(readFileSync(file, 'utf8')).toBe('{}');
  }));
  test('does not replace a dangling configuration symlink', () => fixture((dir, file) => {
    const target = join(dir, 'missing');
    symlinkSync(target, file);
    expect(() => mergedMcpConfig(file, server)).toThrow('Cannot read MCP configuration');
    expect(readlinkSync(file)).toBe(target);
  }));
  test('preview reads existing config and creates no new files', () => fixture((dir, file) => {
    const nested = join(dir, 'nested/mcp.json');
    expect(JSON.parse(mergedMcpConfig(nested, server)).mcpServers['di-framework']).toEqual(server);
    expect(existsSync(join(dir, 'nested'))).toBe(false);
    expect(existsSync(file)).toBe(false);
  }));
});

describe('Grok TOML configuration preservation', () => {
  const existing = `# keep
[models]
default = "grok-4.5"

[mcp_servers.di-framework]
command = "old"
args = ["stale"]

[mcp_servers.di-framework.env]
TOKEN = "secret"

[mcp_servers.other]
command = "other"

[ui]
simple_mode = true
`;
  test('preserves unrelated settings and registrations, and updates idempotently', () => fixture((_dir, file) => {
    writeFileSync(file, existing);
    const content = mergedGrokConfig(file, server);
    writeConfig(file, content);
    expect(content).toContain('# keep\n');
    expect(content).toContain('default = "grok-4.5"\n');
    expect(content).toContain('[mcp_servers.other]\ncommand = "other"\n');
    expect(content).toContain('[ui]\nsimple_mode = true\n');
    expect(content).not.toContain('command = "old"');
    expect(content).not.toContain('TOKEN = "secret"');
    expect(content).toContain(`[mcp_servers.di-framework]\ncommand = ${JSON.stringify(server.command)}\nargs = ${JSON.stringify(server.args)}\n`);
    expect(mergedGrokConfig(file, server)).toBe(content);
  }));
  test('rejects inline mcp_servers without changing the file', () => fixture((_dir, file) => {
    const inline = 'mcp_servers = { other = { command = "other" } }\n';
    writeFileSync(file, inline);
    expect(() => mergedGrokConfig(file, server)).toThrow('Cannot merge Grok configuration');
    expect(readFileSync(file, 'utf8')).toBe(inline);
  }));
  test('names Codex in Codex merge errors', () => fixture((_dir, file) => {
    writeFileSync(file, 'mcp_servers.other.command = "other"\n');
    expect(() => mergedCodexConfig(file, server)).toThrow('Cannot merge Codex configuration');
  }));
  test('rejects unreadable config without replacing it', () => fixture((_dir, file) => {
    mkdirSync(file);
    expect(() => mergedGrokConfig(file, server)).toThrow('Cannot read Grok configuration');
    expect(existsSync(file)).toBe(true);
  }));
  test.skipIf(process.getuid?.() === 0)('rejects permission-denied config unchanged', () => fixture((_dir, file) => {
    writeFileSync(file, existing);
    chmodSync(file, 0o000);
    try { expect(() => mergedGrokConfig(file, server)).toThrow('Cannot read Grok configuration'); }
    finally { chmodSync(file, 0o600); }
    expect(readFileSync(file, 'utf8')).toBe(existing);
  }));
  test('does not replace a dangling configuration symlink', () => fixture((dir, file) => {
    const target = join(dir, 'missing');
    symlinkSync(target, file);
    expect(() => mergedGrokConfig(file, server)).toThrow('Cannot read Grok configuration');
    expect(readlinkSync(file)).toBe(target);
  }));
  test('preview reads a missing config and creates no new files', () => fixture((dir, file) => {
    const nested = join(dir, 'nested/config.toml');
    expect(mergedGrokConfig(nested, server)).toContain('[mcp_servers.di-framework]');
    expect(existsSync(join(dir, 'nested'))).toBe(false);
    expect(existsSync(file)).toBe(false);
  }));

  test('replaces quoted and indented own tables while preserving other TOML values', () => fixture((_dir, file) => {
    const settings = '# keep\nlarge_id = 771752188537605140\nnumbers = [1, 2, 3]\ncreated = 1979-05-27T07:32:00Z\n';
    writeFileSync(file, `${settings}\n  [ "mcp_servers" . 'di-framework' ]\ncommand = "old"\n\n[ui]\nsimple_mode = true\n`);
    const content = mergedCodexConfig(file, server);
    expect(content).toContain(settings);
    expect(content).toContain('[ui]\nsimple_mode = true\n');
    expect(content).not.toContain('command = "old"');
    writeConfig(file, content);
    expect(mergedCodexConfig(file, server)).toBe(content);
  }));

  for (const invalid of ['[broken', 'value = "unterminated', 'value = 1\nvalue = 2', 'mcp_servers = 42']) {
    test(`rejects invalid TOML without replacing it: ${invalid}`, () => fixture((_dir, file) => {
      writeFileSync(file, invalid);
      expect(() => mergedCodexConfig(file, server)).toThrow('the file was not changed');
      expect(readFileSync(file, 'utf8')).toBe(invalid);
    }));
  }
});

class RecordingAdapter implements AgentAdapter {
  readonly name = 'recording';
  readonly calls: string[] = [];
  detected(_base: string, _global: boolean): boolean { return false; }
  configPath(base: string, _global: boolean): string { return join(base, 'agent.json'); }
  mergeConfig(filePath: string, command: ServerCommand): string {
    this.calls.push(`merge:${filePath}`);
    return `${JSON.stringify({ mcpServers: { 'di-framework': command } })}\n`;
  }
  assets(context: InstallContext): InstallAsset[] {
    this.calls.push('assets');
    return [
      { kind: 'skills', destination: join(context.base, 'copied-skills') },
      { kind: 'rule', destination: join(context.base, 'copied-rules'), filename: 'di.md', render: (source) => `RULE\n${source}` },
    ];
  }
}

describe('agent install manifests', () => {
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

  test('plans, writes, and installs assets through any adapter', () => fixture((dir) => {
    const source = sourceTree(dir);
    const base = join(dir, 'project');
    mkdirSync(base);
    const adapter = new RecordingAdapter();
    const manifest = new Manifest(adapter);
    const plan = manifest.plan(context(base, source));
    expect(adapter.calls).toEqual([`merge:${plan.path}`, 'assets']);
    expect(existsSync(plan.path)).toBe(false);
    expect(existsSync(join(base, 'copied-skills'))).toBe(false);
    manifest.write(plan);
    expect(JSON.parse(readFileSync(plan.path, 'utf8')).mcpServers['di-framework']).toEqual(server);
    manifest.installAssets(context(base, source));
    expect(adapter.calls).toEqual([`merge:${plan.path}`, 'assets', 'assets']);
    expect(readFileSync(join(base, 'copied-skills/di-framework/SKILL.md'), 'utf8')).toBe('demo skill\n');
    expect(readFileSync(join(base, 'copied-rules/di.md'), 'utf8')).toBe('RULE\ndi-framework workflow\n');
  }));

  test('skips missing skill and rule sources', () => fixture((dir) => {
    const base = join(dir, 'project');
    const source = join(dir, 'empty-source');
    mkdirSync(base);
    mkdirSync(source);
    const manifest = new Manifest(new RecordingAdapter());
    manifest.installAssets(context(base, source));
    expect(existsSync(join(base, 'copied-skills'))).toBe(false);
    expect(existsSync(join(base, 'copied-rules'))).toBe(false);
  }));

  test('selects agents from the registry', () => fixture((dir) => {
    expect(agentOptionHelp()).toBe('cursor, claude (Claude Code), codex, grok, all, auto (default)');
    expect(() => selectManifests('hermes', dir, false)).toThrow('Unsupported agent: hermes. Supported installers: cursor, claude (Claude Code), codex, grok.');
    expect(() => selectManifests('auto', dir, false)).toThrow('No supported agent detected. Choose --agent cursor, --agent claude, --agent codex, or --agent grok.');
    mkdirSync(join(dir, '.grok'));
    writeFileSync(join(dir, '.mcp.json'), '{}\n');
    expect(selectManifests('auto', dir, false).map((manifest) => manifest.name)).toEqual(['claude', 'grok']);
    expect(selectManifests('auto', dir, true).map((manifest) => manifest.name)).toEqual(['grok']);
    expect(selectManifests('all', dir, false).map((manifest) => manifest.name)).toEqual(['cursor', 'claude', 'codex', 'grok']);
    expect(selectManifests('Grok', dir, false).map((manifest) => manifest.name)).toEqual(['grok']);
  }));
});
