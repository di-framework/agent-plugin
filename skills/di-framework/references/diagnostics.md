# Local lifecycle and diagnosis

Inspect package scripts, resolved framework/CLI versions and lockfile, tsconfig, entrypoint, and `di-framework.config.json`. For deployment, also inspect `di-framework.deploy.toml` and the installed extension version. Existing applications use their own dev/test scripts; new applications start with [bootstrap.md](bootstrap.md). Built-in commands and compiler behavior are in [toolchain.md](toolchain.md).

Diagnose by layer: package resolution and peers, compiler/decorators, container registrations, request/transport behavior, then deployment/toolchain. Preserve the failing command, exit status, and relevant error. Re-run the smallest failing behavior after fixing it.

`di_scaffold_provider` generates a `@Container()` service class. Pass the target's resolved `frameworkVersion`; supported scaffolds are 6.0.3 (default) and 6.0.1. See [composition.md](composition.md) for the runnable example and API limits.

`di_inspect_graph` analyzes supported static source forms. `di_validate_tokens` checks only caller-supplied registration assertions. Dynamic registration, module initialization, ApplicationContext graphs, cron, service-binding proxies, and factories outside analyzed forms require runtime tests. A clean partial analysis does not prove graph resolution or transport readiness.

For HTTP, repository, or RPC changes, use project tests and the relevant bundled example. `bun run check:examples` from this plugin checks example types and behavior. Compiler success and native tests do not establish WASI compatibility, host linking, or a working deployment. For an authorized wasmCloud task, read [platform.md](platform.md); choose the existing cluster owner in [kube.md](kube.md).

Application commands here were checked against the 6.0.3 command tree in `packages/di-framework-cli/main.ts`. That tag's README still lists `agent` and `skills` groups absent from the executable; they belong to the `ai` extension. Confirm installed `--help` before using flags. Versioned sources: [CLI](https://docs.di-framework.dev/v6.0/cli.html), [wasmCloud](https://docs.di-framework.dev/v6.0/wasmcloud.html), and [kube](https://docs.di-framework.dev/v6.0/kube.html). Read [discovery.md](discovery.md) when API provenance is uncertain.

When supporting another release, compare published declarations and tagged implementation, then update references, examples, scaffolds, and distributed rules together. Typecheck and behavior-test against that exact dependency version before declaring support.
