import { randomUUID } from 'node:crypto';
import { accessSync, constants, cpSync, lstatSync, mkdirSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

// Exact published names only. A similarly prefixed custom skill is never retired.
export const retiredFrameworkSkills = [
  'di-framework-actors', 'di-framework-advanced', 'di-framework-ai',
  'di-framework-ai-utils', 'di-framework-api', 'di-framework-app-lifecycle',
  'di-framework-best-practices', 'di-framework-cicd', 'di-framework-cli',
  'di-framework-cli-extensions', 'di-framework-code-quality', 'di-framework-codegen',
  'di-framework-core', 'di-framework-create-app', 'di-framework-data-rpc',
  'di-framework-design-patterns', 'di-framework-docs', 'di-framework-examples',
  'di-framework-graphql', 'di-framework-http-api', 'di-framework-kube',
  'di-framework-platform', 'di-framework-repo', 'di-framework-static-sites',
  'di-framework-testing', 'di-framework-tsc',
] as const;

// Only plugin-owned entries are redistributed from an installed runtime. User
// additions there must not overwrite unrelated skills at another destination.
const bundledSkillEntries = new Set(['di-framework', 'principled-engineering', 'tsconfig.json']);

export type FileAction =
  | { kind: 'copy'; source: string; destination: string }
  | { kind: 'write'; destination: string; content: string }
  | { kind: 'archive'; source: string; destination: string };

function stat(path: string): ReturnType<typeof lstatSync> | undefined {
  try { return lstatSync(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

// Resolve existing ancestors too, so aliased source/runtime paths compare equal.
function canonical(path: string): string {
  if (stat(path)) return realpathSync(path);
  return join(canonical(dirname(path)), relative(dirname(path), path));
}

export function samePath(a: string, b: string): boolean {
  return canonical(resolve(a)) === canonical(resolve(b));
}

function validateDestination(path: string, directory: boolean): void {
  const current = stat(path);
  if (current) {
    // Refuse to follow destination links while copying or writing a managed asset.
    if (current.isSymbolicLink() || (directory ? !current.isDirectory() : !current.isFile())) {
      throw new Error(`Invalid installation destination: ${path}`);
    }
    accessSync(path, constants.W_OK);
  }
  const parent = dirname(path);
  if (parent === path) return;
  const ancestor = stat(parent);
  if (!ancestor) return validateDestination(parent, true);
  if (!ancestor.isDirectory() || ancestor.isSymbolicLink()) throw new Error(`Invalid installation directory: ${parent}`);
  accessSync(parent, constants.W_OK | constants.X_OK);
}

function validateCopy(source: string, destination: string): void {
  const entry = lstatSync(source);
  // Bundled assets have no links. Avoid recursive escapes or cycles from runtime edits.
  if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
    throw new Error(`Unsupported installation source: ${source}`);
  }
  accessSync(source, constants.R_OK | (entry.isDirectory() ? constants.X_OK : 0));
  validateDestination(destination, entry.isDirectory());
  if (entry.isDirectory()) {
    for (const name of readdirSync(source)) validateCopy(join(source, name), join(destination, name));
  }
}

export function planCopy(source: string, destination: string): FileAction[] {
  if (!stat(source) || samePath(source, destination)) return [];
  const from = canonical(resolve(source));
  const to = canonical(resolve(destination));
  if (to.startsWith(`${from}${sep}`) || from.startsWith(`${to}${sep}`)) {
    throw new Error(`Installation source and destination overlap: ${source} -> ${destination}`);
  }
  validateCopy(source, destination);
  return [{ kind: 'copy', source, destination }];
}

export function planWrite(destination: string, content: string): FileAction {
  validateDestination(destination, false);
  return { kind: 'write', destination, content };
}

export function planSkills(source: string, destination: string): FileAction[] {
  if (!stat(source)) return [];
  if (!lstatSync(source).isDirectory()) throw new Error(`Invalid skills source: ${source}`);
  validateDestination(destination, true);
  return readdirSync(source).filter((name) => bundledSkillEntries.has(name))
    .flatMap((name) => planCopy(join(source, name), join(destination, name)));
}

export function newArchiveBatch(base: string): string {
  const root = join(base, '.di-framework/skill-archives');
  let batch: string;
  do { batch = join(root, `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`); } while (stat(batch));
  return batch;
}

export function planRetirement(skills: string, batch: string, target: string): FileAction[] {
  validateDestination(skills, true);
  const actions: FileAction[] = [];
  for (const name of retiredFrameworkSkills) {
    const source = join(skills, name);
    const entry = stat(source);
    if (!entry) continue;
    // Preserve a complete matching folder, including edits, hidden files, and links.
    // A top-level symlink is moved as a link rather than traversing its external tree.
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const destination = join(batch, target, name);
    if (stat(destination)) throw new Error(`Archive destination already exists: ${destination}`);
    validateDestination(destination, true);
    accessSync(dirname(source), constants.W_OK | constants.X_OK);
    actions.push({ kind: 'archive', source, destination });
  }
  return actions;
}

export function applyActions(actions: FileAction[]): void {
  const batches = new Set(actions.filter((action) => action.kind === 'archive').map((action) => dirname(dirname(action.destination))));
  // Reserve batches exclusively before any migration. Never merge into an old batch.
  for (const batch of batches) {
    mkdirSync(dirname(batch), { recursive: true });
    mkdirSync(batch);
  }
  for (const action of actions) {
    mkdirSync(dirname(action.destination), { recursive: true });
    if (action.kind === 'archive') {
      if (stat(action.destination)) throw new Error(`Archive destination already exists: ${action.destination}`);
      renameSync(action.source, action.destination);
    } else if (action.kind === 'copy') {
      cpSync(action.source, action.destination, { recursive: true });
    } else {
      writeFileSync(action.destination, action.content);
    }
  }
}
