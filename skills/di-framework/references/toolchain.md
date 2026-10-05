# di-framework CLI

`@di-framework/cli` is the only public executable. Feature packages expose typed APIs and do not ship their own bins. Requires Bun. The `bin` entry is TypeScript source (`di-framework` → `main.ts`).

Inspect the target's resolved version before prescribing flags. The inspected sibling checkout publishes **6.0.3**. Confirm the live tree with `di-framework --help`. The exhaustive built-in list is `packages/di-framework-cli/tests/unified-cli-contract.test.ts`. Docs: <https://docs.di-framework.dev/cli.html> (`v6.0` snapshot when the install is 6.0.x).

## Install

```bash
bun add -d @di-framework/cli
di-framework <command>
bun x @di-framework/cli <command>
```

`init` scaffolds `package.json`, a tsconfig that loads `@di-framework/tsc`, and `src/index.ts`. Its `build` and `check` scripts call `di-framework`. Runtime-transform wiring is covered below.

## Built-in tree

Built-ins cannot be shadowed. There are no aliases or package-specific CLIs.

| Command | Role |
| --- | --- |
| `init [name]` | Scaffold an app. `--dir`, `--name`, `--force`. Existing files are skipped unless `--force`. |
| `build` / `check` | `ttsc` when it resolves, otherwise `tsc`. `check` is `--noEmit`. |
| `generate` | Schema codegen. `--config`, `--outDir`, `--init`, `--check`, `--clean`. Needs `@di-framework/codegen`. |
| `http openapi generate` | OpenAPI 3.1. `--controllers` is required and repeatable. |
| `actor list\|inspect\|reset\|clean` | Local actor files. `clean` aliases `reset`. |
| `migrations status\|execute` | SQLite migrations. See [persistence.md](persistence.md). |
| `queue list\|inspect\|retry` | Durable SQLite queues. |
| `mx build\|test\|typecheck\|publish` | di-framework monorepo maintenance. Not for applications. |
| `extensions install\|uninstall\|list` | User-global extension store. |

Global `--json` selects the shared envelope. Usage errors exit `2`.

`agent` and `skills` are not on this tree. They mount from `@di-framework/cli-plugin-ai` as `di-framework ai`. Their commands are covered below. Cluster deploy is `di-framework platform` from `@di-framework/cli-plugin-platform`. Read [platform.md](platform.md).

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

## First-party extension command trees

First-party plugins publish
from `di-framework/cli-extensions`:

| Install name | Package | Command group |
| --- | --- | --- |
| `platform` | `@di-framework/cli-plugin-platform` | `di-framework platform` |
| `ai` | `@di-framework/cli-plugin-ai` | `di-framework ai` |

The inspected cli-extensions checkout is **6.0.4**, independent of the **6.0.3** application baseline. Inspect the installed extension and its `--help`. The absent application host groups mount here as `di-framework ai agent` and `di-framework ai skills`.

Run platform commands directly. Do not wrap them in `package.json` scripts.
Cluster resources and guest bindings are the platform package; read the
[platform.md](platform.md) before changing them. Kubesolo lifecycle is [kube.md](kube.md).

## Platform group

Command tree is `createWasmcloudCommand` in
`packages/cli-plugin-platform/src/command.ts`.

- `doctor` checks the project and toolchain.
- `build` writes the component and disposable `.di-framework` state.
- `dev [--host] [--port]` builds, then serves with wasmtime, wash, or jco.
  Default bind is `127.0.0.1:8000`. A guest that imports `wasmcloud:*` selects
  wash. `DI_FRAMEWORK_WASMCLOUD_DEV_RUNNER` pins `wasmtime`, `wash`, or `jco`.
- `deploy [name] [--target]` builds, publishes, and applies the workload.
  No name uses the nearest `di-framework.config.json`.
- `destroy [name] [--target]` removes that workload. It does not remove a cluster.
- `cluster init [--force]`, `cluster up [target] [--yes]`, and
  `cluster destroy [target] [--yes]` own a generated local platform only.
- `console [--target] [--host] [--port]` opens a local console for one target.
- `service create|list|get|delete|classes` manages `BackingService` resources.

Component configuration, targets, tenants, and cluster ownership are in [platform.md](platform.md). `output` is optional and defaults to `dist/<name>.wasm`.

`allowedIpNameLookups` is an explicit DNS allowlist. Omitting it keeps the
host default denial. TLS and HTTPS imports need a host with the opt-in
`wasi-tls` feature. Native `bun test` does not prove the component runs.

## AI group

The extension resolves `@di-framework/ai-utils` from the current project.
Command tree is `createAiCommand` in `packages/cli-plugin-ai/src/command.ts`.

`agent audit` and `agent inspect` do not write files. `agent init` and
`agent migrate` plan only unless that same invocation passes `--apply`.
`skills validate` checks discovered catalogs. `skills index build|inspect|validate|query|migrate`
operates on an explicit index file. Index validation drift and query
abstention exit `1`. Invalid options exit `2`. A missing `@di-framework/ai-utils`
install or an unexpected failure exits `3`.

Chat, `di-ml`, `SkillsAgent`, and catalogs are covered in [ai.md](ai.md).

## Repository checks

From the cli-extensions repository:

```sh
bun install
bun run build
bun test
bun run lint
bun run typecheck
```

`bun test` builds the packages first. Extension modules use
`defineExtension({ schemaVersion: 1, name, description, command })`.
Change the command node and its tests together, then confirm `--help` on a
built install.

## Project setup and runtime checks

`@di-framework/tsc` is a [ttsc](https://ttsc.dev) transform. It prepends runtime checks synthesized from parameter types. Source stays plain TypeScript: no schema library and no per-parameter assert helper. Guide: <https://docs.di-framework.dev/tsc.html>. The inspected sibling checkout publishes **6.0.3**. CLI scaffolding is described above.

`di-framework init` already adds `@di-framework/tsc`, `plugins` in `tsconfig.json`, and `build` / `check` scripts that call `di-framework`. Use the steps below for an existing app.

## Wire an existing app

```bash
npm i -D @di-framework/tsc
```

The package depends on `ttsc` and TypeScript 7+. The first build compiles a Go sidecar (then cached). Needs `go` (1.26+ recommended). `ttsc` can pin the binary with `TTSC_GO_BINARY`.

```json
{
  "compilerOptions": {
    "strict": true,
    "plugins": [{ "transform": "@di-framework/tsc" }]
  }
}
```

The package also sets `ttsc.plugin` for auto-discovery when it is a devDependency. Keep the explicit `plugins` entry. Emit with `ttsc`, not stock `tsc`:

```bash
npx ttsc --emit
```

`di-framework build` runs that emit when `ttsc` resolves. `bun run dev` executes source on Bun and skips emit-time checks. A green Bun dev session does not prove the runtime guards exist.

In the di-framework monorepo, `@di-framework/tsc` is outside the TypeScript 5.x `tsc` project graph. Its package `build` is a no-op. Do not add `ttsc` or TypeScript 7 to other `@di-framework/*` packages to satisfy this plugin.

## What the transform checks

It walks functions, arrows (including concise and async), methods, and constructors. Required parameters get `typeof`, equality, or shape guards. Optional and defaulted parameters are checked only when the value is not `undefined`. Arrays use `Array.isArray` plus an element scan. Tuples check length. Class parameters use `instanceof` when the constructor is a local value. Interfaces stay structural.

Unsupported types are skipped entirely. Do not claim a guard exists for: nested defaults or rest inside destructuring, variadic tuples, imported class bindings, callable intersections, typia-style tags, conditional or mapped types, unions with an unsupported member or more than 12 members, `void`, `never`, or `unique symbol`. Enums with a computed member are skipped. Brand markers are not read at runtime. Structural walks stop at depth eight.

When a parameter is skipped, validation belongs in the function body or a schema at the boundary. Read [codegen.md](codegen.md) if that boundary is a generated HTTP or RPC operation.
