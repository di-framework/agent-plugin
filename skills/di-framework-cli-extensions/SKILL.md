---
name: di-framework-cli-extensions
description: Install or operate the platform and ai di-framework CLI extensions, or change their command trees. Use for di-framework platform, di-framework ai, extensions install, or the cli-extensions repository.
---

# CLI extensions

The host executable is `@di-framework/cli`. Read the `di-framework-cli` skill
for install, built-ins, and the extension store. First-party plugins publish
from `di-framework/cli-extensions`:

| Install name | Package | Command group |
| --- | --- | --- |
| `platform` | `@di-framework/cli-plugin-platform` | `di-framework platform` |
| `ai` | `@di-framework/cli-plugin-ai` | `di-framework ai` |

Community packages are named `di-framework-cli-plugin-<name>` or
`@scope/di-framework-cli-plugin-<name>`. The sibling checkout is **6.0.4**.
Inspect the installed extension and run `--help` before changing a target
project. Project-local extensions take precedence over the user-global store.
Do not silently upgrade a global install.

```sh
di-framework extensions install platform
di-framework extensions install ai
```

The application CLI at **6.0.3** does not register `agent` or `skills`. Those
groups are `di-framework ai agent` and `di-framework ai skills` from the ai
extension. Do not invoke the old host groups.

Run platform commands directly. Do not wrap them in `package.json` scripts.
Cluster resources and guest bindings are the platform package; read the
`di-framework-platform` skill before changing them. Kubesolo lifecycle is `di-framework-kube`.

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

A component project needs `di-framework.config.json` with `name`, `entry`, and
`output`. Deployment targets live in workspace-root `di-framework.deploy.toml`.
`--target` defaults to `default-target`. `${VAR}` interpolation fails when the
variable is unset or empty. Do not put credentials in the manifest.

A **target** is a workspace deploy destination. A **tenant** is the platform
isolation unit (`di-tenant-<t>`, `di-runtime-<t>`, host group `tenant-<t>`).
`tenant = "<t>"` on an external target fills namespace and host group unless
those fields are set explicitly.

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

Library behavior for chat and `di-ml` is the `di-framework-ai` skill.
`SkillsAgent` and skill catalogs are the `di-framework-ai-utils` skill.

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
