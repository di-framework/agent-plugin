---
name: di-framework-app-lifecycle
description: Run, test, build, diagnose, or deploy di-framework applications locally or with the platform CLI extension.
---

# Application lifecycle

Inspect the app's package scripts, resolved framework/CLI versions and lockfile, tsconfig,
entrypoint, `di-framework.config.json`, and (for deployment) `di-framework.deploy.toml`.
Use installed binaries and their `--help`; avoid a one-shot latest CLI changing the
project's toolchain. Application workflows are verified against the **6.0.3** command tree in
`packages/di-framework-cli/main.ts`. The package README at that tag still lists `agent`
and `skills` groups that the executable does not register. Do not run those groups.
Platform extension commands, the shared Pulumi package, and kube are the
`di-framework-cli-extensions`, `di-framework-platform`, and `di-framework-kube` skills. Inspect those installed
versions separately from the application baseline.
Runtime requirements and configuration are version-specific. Narrative docs for this
release are the `v6.0` snapshot, including the [CLI](https://docs.di-framework.dev/v6.0/cli.html),
[wasmCloud](https://docs.di-framework.dev/v6.0/wasmcloud.html), and
[kube](https://docs.di-framework.dev/v6.0/kube.html) topics.

For an existing application, use its development/test scripts. `di-framework check`
and `di-framework build` are the application CLI commands. They use `ttsc` when available
and fall back to TypeScript; inspect the configured compiler and emitted entry before
running output. `bun run dev` executes source and skips emit-time checks. `mx` commands
are framework-monorepo maintenance commands, not application commands.

Built-in application groups in 6.0.3 are `init`, `generate`, `check`, `build`,
`http openapi generate`, `actor` (`list`, `inspect`, `reset`, `clean`), `migrations`
(`status`, `execute`), and `queue` (`list`, `inspect`, `retry`). `extensions install`,
`uninstall`, and `list` manage CLI extensions. Confirm every flag with `--help` on the
installed binary before changing a target project.

For a new app, inspect `di-framework init --help`, scaffold into the requested directory,
install dependencies, then run its generated check/build/dev scripts. Keep package
versions reproducible and verify a real request to the running app. For existing HTTP,
repository or RPC changes, use their project's tests and the relevant bundled example;
`bun run check:examples` in this plugin checks all example types and runs behavior tests.

Diagnose by layer: package resolution and peer dependencies, compiler/decorators,
container registrations, request/transport behavior, then deployment/toolchain. Preserve
the failing command, exit status and relevant error; verify the smallest failing behavior
again after fixing it. `di_inspect_graph` may report incomplete static source analysis; `di_validate_tokens`
checks only caller-supplied assertions. Neither establishes dynamic module initialization
or transport readiness.

For a wasmCloud component, read [the deployment workflow](references/wasmcloud.md)
and the `di-framework-cli-extensions` skill before choosing commands or modifying target
configuration. Building a component and deploying it require additional tools; do not
infer a working deployment from TypeScript compilation. In 6.0 the extension package
is `@di-framework/cli-plugin-platform` and the command group is `platform`. Through
5.x the group was `wasmcloud`. Cluster install and guest bindings are the `di-framework-platform`
skill. Kubesolo lifecycle is the `di-framework-kube` skill. Agent configuration commands are the
`di-framework-ai` skill and the `ai` extension, not the 6.0.3 application CLI.

For APIs and changing commands, query `di_search_docs` and `di_window` with the target's
resolved version, checking provenance. The
[CLI guide](https://github.com/di-framework/di-framework/blob/v6.0.3/packages/di-framework-cli/README.md)
is a fallback only after `--help` on the installed 6.0.3 binary; prefer the tagged
`main.ts` command tree where the README disagrees. When a new release changes these
commands, update the examples and run the affected lifecycle checks before advertising support.

Actors, queues, migrations, scheduling, service bindings, static assets, and the platform
extension are documented on the `v6.0` snapshot. Use those topics and the installed
`--help` output. Do not invent flags or revive 5.x command names.
