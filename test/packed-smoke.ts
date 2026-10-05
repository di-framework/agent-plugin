// Run after `bun run build`: bun test/packed-smoke.ts
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { checkServer } from '../bin/install';

function serverFromToml(toml: string): { command: string; args: string[] } {
  const table = toml.match(/\[mcp_servers\.di-framework\]\ncommand = (".*")\nargs = (\[.*\])\n/);
  assert.ok(table, toml);
  return { command: JSON.parse(table[1]), args: JSON.parse(table[2]) };
}

const destinations = ['.cursor/skills', '.claude/skills', '.agents/skills', '.grok/skills'];
function tree(directory: string): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(path: string, prefix = '') {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      const key = join(prefix, entry.name);
      if (entry.isDirectory()) walk(file, key);
      else result[key] = `${lstatSync(file).mode & 0o777}:${readFileSync(file).toString('base64')}`;
    }
  }
  walk(directory);
  return result;
}
function legacy(directory: string, skill = 'di-framework-api') {
  mkdirSync(join(directory, skill, '.hidden'), { recursive: true });
  writeFileSync(join(directory, skill, 'SKILL.md'), 'user edit\n');
  writeFileSync(join(directory, skill, '.hidden/data'), 'edited hidden data\n');
  writeFileSync(join(directory, skill, 'run'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(directory, skill, 'run'), 0o751);
  mkdirSync(join(directory, 'di-framework-api-custom'), { recursive: true });
  const custom = join(directory, 'di-framework-api-custom/SKILL.md');
  if (!existsSync(custom)) writeFileSync(custom, 'custom skill\n');
}

const root = resolve(import.meta.dir, '..');
const distributedRules = readFileSync(join(root, 'rules/AGENTS.md'), 'utf8');
const cursorRules = `---\ndescription: di-framework workflow\nglobs: *\nalwaysApply: true\n---\n\n${distributedRules}`;
const temporary = mkdtempSync(join(tmpdir(), 'di-packed-'));
const run = (command: string, args: string[], cwd: string, env = process.env) => execFileSync(command, args, { cwd, env, timeout: 120_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  const packed = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], root));
  const tarball = join(temporary, packed[0].filename);
  for (const runtime of ['node', 'bun']) {
    const unpacked = join(temporary, runtime);
    mkdirSync(unpacked);
    run('tar', ['-xzf', tarball, '-C', unpacked], temporary);
    const cli = join(unpacked, 'package/dist/bin/cli.js');
    await checkServer({ command: runtime, args: [cli, 'serve'] }, temporary);
    const workspace = join(temporary, `${runtime}-workspace`);
    mkdirSync(workspace);
    const before = readdirSync(workspace);
    run(runtime, [cli, 'install', '--agent', 'all', '--dry-run'], workspace);
    assert.deepEqual(readdirSync(workspace), before);
    mkdirSync(join(workspace, '.cursor'));
    writeFileSync(join(workspace, '.cursor/mcp.json'), '{"settings":{"keep":true},"mcpServers":{"other":{"command":"other"}}}');
    writeFileSync(join(workspace, '.mcp.json'), '{invalid');
    mkdirSync(join(workspace, '.grok/rules'), { recursive: true });
    const grokBefore = '# keep\n[mcp_servers.other]\ncommand = "other"\n';
    writeFileSync(join(workspace, '.grok/config.toml'), grokBefore);
    writeFileSync(join(workspace, '.grok/rules/keep.md'), 'keep\n');
    for (const destination of destinations) legacy(join(workspace, destination));
    const legacyTree = tree(join(workspace, '.cursor/skills/di-framework-api'));
    const invalidBefore = tree(workspace);
    assert.throws(() => run(runtime, [cli, 'install', '--agent', 'all'], workspace));
    assert.deepEqual(tree(workspace), invalidBefore);
    assert.equal(existsSync(join(workspace, '.di-framework')), false);
    assert.equal(readFileSync(join(workspace, '.mcp.json'), 'utf8'), '{invalid');
    assert.equal(readFileSync(join(workspace, '.grok/config.toml'), 'utf8'), grokBefore);
    writeFileSync(join(workspace, '.mcp.json'), '{"otherSetting":42}');
    const previewBefore = tree(workspace);
    const preview = run(runtime, [cli, 'install', '--agent', 'all', '--dry-run'], workspace);
    assert.ok(preview.includes('Would archive:'));
    for (const destination of destinations) assert.ok(preview.includes(join(destination, 'principled-engineering')));
    assert.deepEqual(tree(workspace), previewBefore);
    assert.equal(readFileSync(join(workspace, '.grok/config.toml'), 'utf8'), grokBefore);
    assert.equal(existsSync(join(workspace, '.di-framework')), false);
    run(runtime, [cli, 'install', '--agent', 'all'], workspace);
    const installed = readFileSync(join(workspace, '.cursor/mcp.json'), 'utf8');
    const installedGrok = readFileSync(join(workspace, '.grok/config.toml'), 'utf8');
    assert.equal(installedGrok.includes('# keep\n'), true);
    assert.equal(installedGrok.includes('[mcp_servers.other]\ncommand = "other"\n'), true);
    assert.equal(readFileSync(join(workspace, '.grok/rules/keep.md'), 'utf8'), 'keep\n');
    assert.equal(readFileSync(join(workspace, '.grok/rules/di-framework.md'), 'utf8'), distributedRules);
    assert.equal(readFileSync(join(workspace, '.cursor/rules/di-framework.mdc'), 'utf8'), cursorRules);
    const archives = join(workspace, '.di-framework/skill-archives');
    const firstBatch = readdirSync(archives)[0];
    for (const target of ['cursor', 'claude', 'codex', 'grok']) {
      assert.deepEqual(tree(join(archives, firstBatch, target, 'di-framework-api')), legacyTree);
    }
    legacy(join(workspace, '.di-framework/plugin/skills'), 'di-framework-core');
    writeFileSync(join(workspace, '.di-framework/plugin/skills/di-framework-api-custom/SKILL.md'), 'runtime custom skill\n');
    mkdirSync(join(workspace, '.di-framework/plugin/skills/runtime-only'));
    writeFileSync(join(workspace, '.di-framework/plugin/skills/runtime-only/SKILL.md'), 'runtime only\n');
    run(runtime, [cli, 'update', '--agent', 'all'], workspace);
    assert.equal(readdirSync(archives).length, 2);
    const secondBatch = readdirSync(archives).find(batch => batch !== firstBatch)!;
    assert.deepEqual(tree(join(archives, secondBatch, 'runtime/di-framework-core')), legacyTree);
    const archivedBefore = tree(archives);
    run(runtime, [cli, 'update', '--agent', 'all'], workspace);
    assert.deepEqual(tree(archives), archivedBefore);
    assert.equal(readFileSync(join(workspace, '.cursor/mcp.json'), 'utf8'), installed);
    assert.equal(readFileSync(join(workspace, '.grok/config.toml'), 'utf8'), installedGrok);
    assert.equal(JSON.parse(installed).settings.keep, true);
    assert.equal(JSON.parse(installed).mcpServers.other.command, 'other');
    const bundledSkills = readdirSync(join(unpacked, 'package/skills'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    assert.deepEqual(bundledSkills, ['di-framework', 'principled-engineering']);
    const expected = Object.fromEntries(bundledSkills.map(skill => [skill, tree(join(unpacked, 'package/skills', skill))]));
    function verifySkills() {
      for (const destination of [...destinations, '.di-framework/plugin/skills']) {
        for (const skill of bundledSkills) assert.deepEqual(tree(join(workspace, destination, skill)), expected[skill]);
        assert.equal(existsSync(join(workspace, destination, 'di-framework-api')), false);
        assert.equal(existsSync(join(workspace, destination, 'di-framework-core')), false);
        const custom = destination === '.di-framework/plugin/skills' ? 'runtime custom skill\n' : 'custom skill\n';
        assert.equal(readFileSync(join(workspace, destination, 'di-framework-api-custom/SKILL.md'), 'utf8'), custom);
        assert.equal(existsSync(join(workspace, destination, 'runtime-only')), destination === '.di-framework/plugin/skills');
      }
    }
    verifySkills();
    rmSync(unpacked, { recursive: true });
    for (const destination of destinations) {
      for (const skill of bundledSkills) rmSync(join(workspace, destination, skill), { recursive: true });
    }
    rmSync(join(workspace, '.cursor/rules'), { recursive: true });
    rmSync(join(workspace, '.grok/rules'), { recursive: true });
    const durableCli = join(workspace, '.di-framework/plugin/dist/bin/cli.js');
    run(runtime, [durableCli, 'update', '--agent', 'all'], workspace);
    verifySkills();
    assert.deepEqual(tree(archives), archivedBefore);
    // Legacy folders reintroduced into the durable source are archived, never copied.
    legacy(join(workspace, '.di-framework/plugin/skills'));
    run(runtime, [durableCli, 'update', '--agent', 'all'], workspace);
    verifySkills();
    assert.equal(readdirSync(archives).length, 3);
    const thirdBatch = readdirSync(archives).find(batch => batch !== firstBatch && batch !== secondBatch)!;
    assert.deepEqual(tree(join(archives, thirdBatch, 'runtime/di-framework-api')), legacyTree);
    for (const batch of [firstBatch, secondBatch]) {
      for (const [file, content] of Object.entries(archivedBefore).filter(([file]) => file.startsWith(batch))) {
        assert.equal(tree(archives)[file], content);
      }
    }
    assert.equal(existsSync(join(workspace, '.cursor/rules/di-framework.mdc')), true);
    assert.equal(readFileSync(join(workspace, '.grok/rules/di-framework.md'), 'utf8'), distributedRules);
    assert.equal(readFileSync(join(workspace, '.cursor/rules/di-framework.mdc'), 'utf8'), cursorRules);
    for (const path of ['.cursor/mcp.json', '.mcp.json']) {
      const config = JSON.parse(readFileSync(join(workspace, path), 'utf8'));
      await checkServer(config.mcpServers['di-framework'], workspace);
    }
    await checkServer(serverFromToml(installedGrok), workspace);
    await checkServer(serverFromToml(readFileSync(join(workspace, '.codex/config.toml'), 'utf8')), workspace);
    console.log(`${runtime}: packed serve, dry-run, invalid config, repeat install, complete skills, edited archives, durable updates passed`);
  }
  const grokWorkspace = join(temporary, 'grok-only');
  mkdirSync(grokWorkspace);
  run('node', [join(temporary, 'node-workspace/.di-framework/plugin/dist/bin/cli.js'), 'install', '--agent', 'grok'], grokWorkspace);
  const grokSkills = readdirSync(join(grokWorkspace, '.grok/skills'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
  for (const skill of grokSkills) assert.equal(existsSync(join(grokWorkspace, '.grok/skills', skill, 'SKILL.md')), true);
  assert.equal(readFileSync(join(grokWorkspace, '.grok/rules/di-framework.md'), 'utf8'), distributedRules);
  await checkServer(serverFromToml(readFileSync(join(grokWorkspace, '.grok/config.toml'), 'utf8')), grokWorkspace);
  assert.equal(existsSync(join(grokWorkspace, '.cursor')), false);
  assert.equal(existsSync(join(grokWorkspace, '.mcp.json')), false);
  console.log('grok: --agent grok wrote config, skills, and rules');
  // Exercise npx's documented command shape against the packed artifact, then
  // remove its entire cache to prove generated commands do not depend on it.
  const workspace = join(temporary, 'npx-workspace');
  const cache = join(temporary, 'npm-cache');
  mkdirSync(workspace);
  const runnerArgs = ['--yes', '--cache', cache, '--package', tarball, '--', 'di-framework-plugin'];
  run('npx', [...runnerArgs, 'install', '--agent', 'cursor'], workspace);
  // Package runners may validate/install dependencies before starting the server,
  // even with a populated cache. Give this network-dependent phase a bounded
  // two-minute startup budget; installed runtime health checks retain 10 seconds.
  await checkServer({ command: 'npx', args: [...runnerArgs, 'serve'] }, workspace, 120_000);
  rmSync(cache, { recursive: true, force: true });
  const config = JSON.parse(readFileSync(join(workspace, '.cursor/mcp.json'), 'utf8'));
  await checkServer(config.mcpServers['di-framework'], workspace);
  console.log('npx: documented serve and installation after cache deletion passed');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
