---
name: di-framework-cli
description: Install and operate the di-framework CLI, built-in commands, and installable plugins. Use for @di-framework/cli, di-framework init, build, check, generate, extensions install, or when adding a command under packages/di-framework-cli.
---

# di-framework CLI

`@di-framework/cli` is the only public executable. Feature packages expose typed APIs and do not ship their own bins. Requires Bun. The `bin` entry is TypeScript source (`di-framework` → `main.ts`).

Inspect the target's resolved version before prescribing flags. The sibling checkout publishes **6.0.3**. Confirm the live tree with `di-framework --help`. The exhaustive built-in list is `packages/di-framework-cli/tests/unified-cli-contract.test.ts`. Docs: <https://docs.di-framework.dev/cli.html> (`v6.0` snapshot when the install is 6.0.x).

## Install

```bash
bun add -d @di-framework/cli
di-framework <command>
bun x @di-framework/cli <command>
```

`init` scaffolds `package.json`, a tsconfig that loads `@di-framework/tsc`, and `src/index.ts`. Its `build` and `check` scripts call `di-framework`. Read the `di-framework-tsc` skill before changing that wiring.

## Built-in tree

Built-ins cannot be shadowed. There are no aliases or package-specific CLIs.

| Command | Role |
| --- | --- |
| `init [name]` | Scaffold an app. `--dir`, `--name`, `--force`. Existing files are skipped unless `--force`. |
| `build` / `check` | `ttsc` when it resolves, otherwise `tsc`. `check` is `--noEmit`. |
| `generate` | Schema codegen. `--config`, `--outDir`, `--init`, `--check`, `--clean`. Needs `@di-framework/codegen`. |
| `http openapi generate` | OpenAPI 3.1. `--controllers` is required and repeatable. |
| `actor list\|inspect\|reset\|clean` | Local actor files. `clean` aliases `reset`. |
| `migrations status\|execute` | SQLite migrations. See `di-framework-repo`. |
| `queue list\|inspect\|retry` | Durable SQLite queues. |
| `mx build\|test\|typecheck\|publish` | di-framework monorepo maintenance. Not for applications. |
| `extensions install\|uninstall\|list` | User-global extension store. |

Global `--json` selects the shared envelope. Usage errors exit `2`.

`agent` and `skills` are not on this tree. They mount from `@di-framework/cli-plugin-ai` as `di-framework ai`. Read `di-framework-cli-extensions`. Cluster deploy is `di-framework platform` from `@di-framework/cli-plugin-platform`. Read `di-framework-platform`.

## Extensions

```bash
di-framework extensions install platform
di-framework extensions install ai
di-framework platform --help
di-framework extensions list
di-framework extensions uninstall platform
```

A short name installs `@di-framework/cli-plugin-<name>`. Also accepted: `di-framework-cli-plugin-<name>` and `@<scope>/di-framework-cli-plugin-<name>`.

The store is `~/.di-framework/extensions` (`DI_FRAMEWORK_EXTENSIONS_DIR` overrides). A copy in the project `node_modules` wins over the user store. Do not silently upgrade a global install. The default export is `defineExtension({ schemaVersion: 1, name, description, command })` from `@di-framework/cli-extension`. Extension packages must not declare a `bin`. An unknown first token dispatches to an installed extension. Mounted commands inherit help, `--json`, and exit statuses.

## Adding a command

Register the node in `createCommandTree` in `main.ts`. Handlers under `cmd/` translate arguments and return structured data; domain behavior stays in the owning package. Update `unified-cli-contract.test.ts` in the same change, then confirm `--help` on a built install.
