---
name: di-framework-create-app
description: Create a new di-framework application with di-framework init, then grow it into an HTTP service with lifecycle, config, tests, and quality gates. Use when the user wants a new app, project, service, API, or starter, or asks how to bootstrap di-framework.
---

# Create an app

There is no `create-*` package or `bun create` template. `di-framework init` from `@di-framework/cli` is the only scaffold. Check `di-framework init --help` on the binary you run. Guidance here is verified against **6.0.3**, the latest release; check `npm view @di-framework/core version` and confirm newer releases against their published types. Docs: `installation.html` and `quick-start.html` (`v6.0` snapshot for 6.0.x).

## Scaffold

```bash
bun x @di-framework/cli init my-api
cd my-api && bun install && bun run dev
```

Flags: `--dir/-d` (default `./<name>`), `--name/-n` (package name; a positional name wins; default `di-app`), `--force/-f`. Existing files are skipped unless `--force`, so read the `skip ... (exists)` lines when targeting a non-empty directory. Unknown flags exit `2`.

`init` writes four files:

| File | Content |
| --- | --- |
| `package.json` | `type: module`; scripts `dev` (`bun run src/index.ts`), `build` (`di-framework build`), `start` (`node dist/index.js`), `check` (`di-framework check`); `@di-framework/core`, dev `@di-framework/cli`, `@di-framework/tsc`, `@types/bun` |
| `tsconfig.json` | `ESNext`, `NodeNext` resolution, `rootDir: src`, `outDir: dist`, `strict`, `experimentalDecorators: true`, `emitDecoratorMetadata: false`, `plugins: [{ "transform": "@di-framework/tsc" }]` |
| `src/index.ts` | Two `@Container()` classes with constructor `@Component` injection, resolved with `useContainer()` |
| `README.md` | Scripts and next steps |

Dependencies are written as `latest`. After `bun install`, pin every `@di-framework/*` package to the same resolved release and commit `bun.lock`; mixed releases load two cores. `NodeNext` needs `.js` extensions on relative imports; the starter below and the `examples` repo use `Bundler` resolution instead. Pick one deliberately.

The first `bun run build` compiles the `@di-framework/tsc` Go sidecar (needs `go`, 1.26+ recommended). `bun run dev` runs source and skips those runtime guards, so run `check` and `build` before calling the scaffold working. Read `di-framework-tsc`.

## HTTP service starter

[assets/http-service/](assets/http-service/) is a starter tested against the 6.0.3 packages:

- `src/greeting-service.ts`: a `@Container()` service.
- `src/http-server.ts`: a `TypedRouter` owner with constructor injection, a `fetch` method for tests, and `start()` / `stop()` around `Bun.serve`.
- `src/index.ts`: the startup entry. `ApplicationContext.builder(useContainer()).bootstrap(HttpServer)`, `await app.start()`, and `stop()` on `SIGINT`/`SIGTERM`.
- `src/http-server.test.ts`: a fresh container, a `registerValue` test double, and requests through `fetch` without opening a socket.
- `package.json` and `tsconfig.json` with `test`, `typecheck`, `check`, and `build` scripts; tests are excluded from emit.

Copy it over the `init` output (or into an empty directory), set the package name, update the pins to the release you install, then `bun install`. Run `bun test` from the project root: Bun reads `experimentalDecorators` from the tsconfig in the working directory.

## Grow it

1. **Features.** `src/features/<name>/` with service, port, adapter, and routes; `src/index.ts` stays the startup entry, and token bindings go in `@Configuration()` / `@Bean` classes. Read `di-framework-design-patterns`.
2. **Routes and auth.** `di-framework-http-api`. POST bodies need `content-type: application/json`.
3. **Config.** `bun add @di-framework/config`; a `@Configuration` class with defaults plus `envSource({ prefix: 'APP_' })`, or `bun add yaml` and `yamlFileSource('./config.yaml', { optional: true })`. Replace the starter's `process.env.PORT`.
4. **Persistence and RPC.** `di-framework-repo`, `di-framework-data-rpc`. Start with `InMemoryRepository`; swap the adapter in one `@Bean` later.
5. **Tests.** `di-framework-testing`.
6. **Quality and CI.** `di-framework-code-quality` (Biome, hooks, typecheck) and `di-framework-cicd` (workflow and Dependabot templates).

## wasmCloud

Only a platform app needs `di-framework.config.json` (`name` and `entry` required; `output` defaults to `dist/<name>.wasm`). The entry must default-export a fetch handler; a router works as-is. `di-framework extensions install platform`, then `di-framework platform cluster init` (there is no `platform init`) scaffolds `deploy/platform` and `di-framework.deploy.toml`. Read `di-framework-app-lifecycle` and `di-framework-platform` first.

## Done means

A committed lockfile, passing `bun run check`, `bun test`, and `bun run build`, and a real request against the running app (`curl localhost:3000/health` on `bun run dev`) returning the expected body. Samples: `examples/framework/http-router`, `config`, `services` (`di-framework-examples`). Their pins may lag the current major; installed types win.
