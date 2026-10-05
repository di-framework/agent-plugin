import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, statSync, lstatSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parse as parseToml } from 'toml';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface ServerCommand { command: string; args: string[] }
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Read before making any installation changes. Only ENOENT means a new config.
export function mergedMcpConfig(filePath: string, server: ServerCommand): string {
  let config: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!isObject(parsed) || (parsed.mcpServers !== undefined && !isObject(parsed.mcpServers))) {
      throw new Error('expected a JSON object with an object-valued mcpServers property');
    }
    config = parsed;
  } catch (error) {
    let missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (missing) {
      try { lstatSync(filePath); missing = false; } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== 'ENOENT') missing = false;
      }
    }
    if (!missing) {
      throw new Error(`Cannot read MCP configuration ${filePath}. Fix its permissions or JSON before retrying; the file was not changed. ${String(error)}`);
    }
  }
  config.mcpServers = { ...(config.mcpServers as Record<string, unknown> | undefined), 'di-framework': server };
  return `${JSON.stringify(config, null, 2)}\n`;
}

// Codex and Grok store stdio MCP registrations as TOML tables under
// [mcp_servers.<name>]. Replace only our table so repeated installs preserve
// the user's other settings and MCP servers.
export function mergedStdioTomlConfig(filePath: string, server: ServerCommand, product: string): string {
  let config = '';
  try {
    config = readFileSync(filePath, 'utf8');
  } catch (error) {
    let missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
    if (missing) {
      try { lstatSync(filePath); missing = false; } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== 'ENOENT') missing = false;
      }
    }
    if (!missing) {
      throw new Error(`Cannot read ${product} configuration ${filePath}. Fix its permissions or TOML before retrying; the file was not changed. ${String(error)}`);
    }
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseToml(config, { bigint: true });
    if (parsed.mcp_servers !== undefined && !isObject(parsed.mcp_servers)) {
      throw new Error('expected an object-valued mcp_servers table');
    }
  } catch (error) {
    throw new Error(`Cannot merge ${product} configuration ${filePath}: invalid TOML; the file was not changed. ${String(error)}`);
  }

  // TOML forbids defining a table both inline and as a header. Avoid silently
  // producing an invalid config when the top-level map uses inline syntax.
  if (/^\s*mcp_servers(?:\s*=|\s*\.)/m.test(config)) {
    throw new Error(`Cannot merge ${product} configuration ${filePath}: mcp_servers uses inline or dotted TOML syntax. Convert it to tables before retrying; the file was not changed.`);
  }
  const ownHeader = /^\s*\[\s*(?:mcp_servers|"mcp_servers"|'mcp_servers')\s*\.\s*(?:di-framework|"di-framework"|'di-framework')\s*(?:\.|\])/;
  const lines = config.split(/(?<=\n)/);
  let inOwnTable = false;
  const kept = lines.filter((line) => {
    if (/^\s*\[/.test(line)) {
      inOwnTable = ownHeader.test(line);
      return !inOwnTable;
    }
    return !inOwnTable;
  }).join('');
  const separator = kept.length === 0 || kept.endsWith('\n') ? '' : '\n';
  const table = `[mcp_servers.di-framework]\ncommand = ${JSON.stringify(server.command)}\nargs = ${JSON.stringify(server.args)}\n`;
  const merged = `${kept}${separator}${kept && !kept.endsWith('\n\n') ? '\n' : ''}${table}`;
  // Catch representations that the preservation-oriented table edit cannot merge.
  try {
    const result: Record<string, unknown> = parseToml(merged, { bigint: true });
    const unrelated = (document: Record<string, unknown>) => {
      const servers = { ...(document.mcp_servers as Record<string, unknown> | undefined) };
      delete servers['di-framework'];
      return { ...document, mcp_servers: servers };
    };
    if (!isDeepStrictEqual(unrelated(parsed), unrelated(result))) throw new Error('unrelated settings would change');
  } catch (error) {
    throw new Error(`Cannot merge ${product} configuration ${filePath}: unsupported TOML table syntax; the file was not changed. ${String(error)}`);
  }
  return merged;
}

export function mergedCodexConfig(filePath: string, server: ServerCommand): string {
  return mergedStdioTomlConfig(filePath, server, 'Codex');
}

export function mergedGrokConfig(filePath: string, server: ServerCommand): string {
  return mergedStdioTomlConfig(filePath, server, 'Grok');
}

export function writeConfig(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  let mode = 0o600;
  try { mode = statSync(filePath).mode & 0o777; } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    writeFileSync(temporary, content, { mode, flag: 'wx' });
    renameSync(temporary, filePath);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export async function checkServer(server: ServerCommand, cwd = process.cwd(), startupTimeoutMs = 10_000): Promise<string[]> {
  const client = new Client({ name: 'di-framework-health-check', version: '1.0.0' });
  const transport = new StdioClientTransport({ ...server, cwd, stderr: 'inherit' });
  try {
    await client.connect(transport, { timeout: startupTimeoutMs });
    const result = await client.listTools({}, { timeout: 10_000 });
    const names = result.tools.map((tool) => tool.name);
    const expected = ['di_search_docs', 'di_window', 'di_scaffold_provider', 'di_validate_tokens', 'di_inspect_graph'];
    if (expected.some((name) => !names.includes(name))) {
      throw new Error(`MCP tool discovery incomplete: ${names.join(', ')}`);
    }
    return names;
  } finally {
    await client.close();
    await transport.close();
  }
}
