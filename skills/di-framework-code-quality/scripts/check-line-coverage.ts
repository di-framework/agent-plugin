#!/usr/bin/env bun
/**
 * Fail when any source file in coverage/lcov.info is below 100% line coverage.
 * Bun's coverageThreshold applies to the aggregate; this catches a single uncovered file.
 *
 *   bun test --coverage --coverage-reporter=lcov
 *   bun scripts/check-line-coverage.ts [sourcePrefix ...]   # default: src/ packages/
 */
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const lcovPath = resolve(root, 'coverage/lcov.info');
const prefixes = process.argv.slice(2).length ? process.argv.slice(2) : ['src/', 'packages/'];

if (!existsSync(lcovPath)) {
  console.error(`Missing ${lcovPath}. Run: bun test --coverage --coverage-reporter=lcov`);
  process.exit(1);
}

const isSource = (file: string) =>
  prefixes.some((prefix) => file.startsWith(prefix)) &&
  /\.(ts|tsx|js)$/.test(file) &&
  !/(^|\/)(tests?|dist|scripts|generated)\//.test(file) &&
  !/\.(test|spec)\.(ts|tsx|js)$/.test(file);

const misses: Array<{ file: string; lines: number[] }> = [];
for (const record of readFileSync(lcovPath, 'utf8').split('end_of_record')) {
  const source = record.split('\n').find((line) => line.startsWith('SF:'));
  if (!source) continue;
  const file = relative(root, resolve(root, source.slice(3))).replaceAll('\\', '/');
  if (!isSource(file)) continue;
  const lines = record
    .split('\n')
    .filter((line) => line.startsWith('DA:') && line.endsWith(',0'))
    .map((line) => Number(line.slice(3).split(',')[0]));
  if (lines.length) misses.push({ file, lines });
}

if (misses.length === 0) {
  console.log('All source files have 100% line coverage.');
  process.exit(0);
}
for (const { file, lines } of misses) console.error(`${file}: uncovered lines ${lines.join(', ')}`);
process.exit(1);
