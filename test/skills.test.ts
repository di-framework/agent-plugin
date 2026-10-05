import { expect, test } from 'bun:test';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dir, '../skills');
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
const tree = files(root);

test('only two bundled skill entrypoints are discoverable, with valid identities', () => {
  const skills = tree.filter((file) => file.endsWith('/SKILL.md'));
  expect(skills.map((file) => relative(root, file)).sort()).toEqual(['di-framework/SKILL.md', 'principled-engineering/SKILL.md']);
  for (const file of skills) {
    const text = readFileSync(file, 'utf8');
    expect(text.match(/^---\nname: ([a-z0-9-]+)\n/)?.[1]).toBe(relative(root, dirname(file)));
    expect(text).toMatch(/\ndescription: \S/);
  }
});

test('all relative documentation links resolve and every framework reference is reachable', () => {
  const links = new Map<string, string[]>();
  for (const file of tree.filter((file) => file.endsWith('.md'))) {
    const targets: string[] = [];
    for (const match of readFileSync(file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
      const link = match[1].split('#')[0];
      if (!link || /^(?:[a-z]+:|\/)/i.test(link)) continue;
      const target = resolve(dirname(file), link);
      expect(existsSync(target), `${relative(root, file)} -> ${link}`).toBe(true);
      targets.push(target);
    }
    links.set(file, targets);
  }
  const reached = new Set<string>();
  function visit(file: string) {
    if (reached.has(file)) return;
    reached.add(file);
    for (const target of links.get(file) ?? []) visit(target);
  }
  visit(resolve(root, 'di-framework/SKILL.md'));
  for (const file of tree.filter((file) => file.includes('/di-framework/references/'))) {
    expect(reached.has(file), relative(root, file)).toBe(true);
  }
});

test('the coverage helper and copied git hooks keep executable permissions', () => {
  for (const file of ['scripts/check-line-coverage.ts', 'assets/githooks/pre-commit', 'assets/githooks/pre-push']) {
    expect(lstatSync(resolve(root, 'di-framework', file)).mode & 0o111).toBe(0o111);
  }
});
