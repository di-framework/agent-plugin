#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createDiMcpServer } from '../src/server';
import { checkServer } from './install';
import { agentOptionHelp, assertKnownAgent, planInstallation, selectManifests, type InstallContext } from './manifest';
import { applyActions } from './assets';

const args = process.argv.slice(2);
const command = args[0];
const isGlobal = args.includes('--global') || args.includes('-g');
const dryRun = args.includes('--dry-run');
function option(flag: string): string | undefined {
  const value = args.find((arg) => arg.startsWith(`${flag}=`));
  if (value) return value.slice(flag.length + 1);
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  if (!args[index + 1] || args[index + 1].startsWith('-')) throw new Error(`Missing value for ${flag}`);
  return args[index + 1];
}
function help() {
  console.log(`@di-framework/plugin
Usage: npx -y @di-framework/plugin <command> [options]
  serve                 Start the stdio MCP server
  install | update      Copy a durable runtime and configure supported agents
  check                 Initialize the installed MCP server and list tools
  help                  Show help
Options for install, update, check:
  --agent, -a <name>     ${agentOptionHelp()}
  --global, -g          User configuration instead of project configuration
  --dry-run             Validate and preview installation without writing
Select versions with npx -y @di-framework/plugin@<version> install.
`);
}
async function run() {
  if (!command || command === 'help' || args.includes('--help') || args.includes('-h')) return help();
  if (command === 'serve') {
    await createDiMcpServer().connect(new StdioServerTransport());
    return;
  }
  if (!['install', 'update', 'check'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const agent = (option('--agent') ?? option('-a') ?? 'auto').toLowerCase();
  assertKnownAgent(agent);
  const cwd = process.cwd();
  const base = isGlobal ? homedir() : cwd;
  const runtime = join(base, '.di-framework/plugin');
  const server = { command: process.execPath, args: [join(runtime, 'dist/bin/cli.js'), 'serve'] };
  if (command === 'check') {
    const names = await checkServer(server);
    console.log(`MCP initialized; discovered ${names.join(', ')}`);
    return;
  }
  let source = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (!existsSync(join(source, 'package.json'))) source = resolve(source, '..');
  const context: InstallContext = { base, source, global: isGlobal, server };
  const selected = selectManifests(agent, base, isGlobal);
  // Validate every target before copying files or changing any configuration.
  if (!existsSync(join(source, 'dist/bin/cli.js'))) throw new Error('Built CLI is missing. Build the package before installing.');
  const planned = planInstallation(context, selected);
  console.log(`${dryRun ? 'Would install' : 'Installing'} runtime: ${runtime}`);
  for (const { plan } of planned.agents) console.log(`${dryRun ? 'Would merge' : 'Merging'} ${plan.name}: ${plan.path}`);
  for (const action of planned.actions) {
    const from = action.kind === 'write' ? '' : `${action.source} -> `;
    console.log(`${dryRun ? 'Would ' : ''}${action.kind}: ${from}${action.destination}`);
  }
  if (dryRun) return;
  applyActions(planned.actions);
  const names = await checkServer(server);
  for (const { manifest, plan } of planned.agents) manifest.write(plan);
  console.log(`MCP initialized; discovered ${names.length} tools. Configuration saved.`);
}
run().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
