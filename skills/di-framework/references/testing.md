# Testing a di-framework app

Use Bun's runner (`bun:test`), as the framework and its examples do. If the app already uses another runner, keep it and apply the container rules below. Inspect `bunfig.toml`, the `test` script, and where existing tests live, then match them.

Start from [assets/feature.test.ts](../assets/feature.test.ts). It is verified against the published 6.0.3 packages and shows a fresh container per test, a port replaced with `registerValue`, an `InMemoryRepository`, idempotency and failure assertions, and a route exercised through `router.fetch`. Package test helpers for RPC, events, queues, cron, actors, config, and auth follow below.

## Container isolation

Pick one approach per suite.

- **Fresh container (preferred).** `import { Container as DIContainer } from '@di-framework/core/container'`. In `beforeEach`, build one, `register` the real classes under test, and `registerValue(Token, fake)` their collaborators. Resolve only from that instance. Decorated classes keep their `@Component` metadata in a new container; only the automatic registration is global.
- **Global reset.** Code that resolves through `useContainer()` (static handlers, `@Controller` classes, module-level routers) needs `beforeEach(() => useContainer().clear())`. `@Container()` registers once, at import time, so re-register what the test needs afterwards (`if (!c.has(X)) c.register(X)`). `clear()` also stops cron jobs and removes listeners.

Substitute under the token the consumer injects. Registering `MockDatabase` changes nothing for a class that injects `DatabaseService`; register the fake as `DatabaseService` (or the string token).

`fork()` copies registrations and resets singleton caches unless `carrySingletons: true`; factories still use the container they captured. `container.construct(Class, { 1: value })` builds one instance with an overridden constructor argument and does not register it.

## What to test

- **Services**: public behavior with fakes at the ports. Assert resulting state (repository contents, returned values). Assert calls only when the call is the contract (charged exactly once).
- **Routes**: build the router from a resolved service and `await router.fetch(new Request(...))`. Do not start `Bun.serve` in unit tests. POST and PUT bodies need `content-type: application/json` or the router answers 415. Cover success, bad input, missing credentials (401), and insufficient permission (403); see [http.md](http.md).
- **Startup**: one test that resolves the entry component, or runs `ApplicationContext.start()` then `stop()`, catches missing registrations before deploy.
- **Configuration**: feed values through `objectSource` / `envSource({ env: {...} })`; do not mutate `process.env`.
- **Time**: queues have `advanceTime`; cron has `invokeCronJob` and no fake clock. Avoid real `sleep` in tests.

Static analysis from the plugin (`di_inspect_graph`, `di_validate_tokens`) does not replace a test that resolves the graph.

## Layout

- `*.test.ts` beside the source (`src/features/orders/order-service.test.ts`), or a `tests/` directory if the app already uses one.
- Exclude tests from the emit tsconfig (`"exclude": ["src/**/*.test.ts"]`) so they do not land in `dist`.
- Prefer DI substitution over `mock.module`. Use `mock.module` only for modules the container does not create.
- Run `bun test` from the project root. Bun reads `experimentalDecorators` from the tsconfig in the working directory; a decorator test that passes from the root and fails from a subdirectory is a cwd problem, not a framework bug.

## Coverage

`bun test --coverage`. Enforce it in `bunfig.toml` with `coverageThreshold = { lines = <ratio>, functions = 0 }`. Leave `functions` at 0, because Bun under-counts decorated constructors. A run that reports `0 fail` but exits 1 is below the threshold: add tests for the reported lines rather than ignore patterns. Hooks, the per-file coverage script, and CI are in [quality-and-ci.md](quality-and-ci.md).

End-to-end confidence still needs a real request against the running app (`bun run dev`, then `curl`), as [bootstrap.md](bootstrap.md) describes.

## Test helpers shipped by framework packages

There is no `@di-framework/testing` package. These in-memory implementations ship in the packages themselves; install only the packages the app already uses. Confirm each export against the installed version's types.

| Area | Use in tests | Import |
| --- | --- | --- |
| Repositories | `InMemoryRepository<E, ID>`; implements `ConditionalStorageAdapter` (`saveIfAbsent`, `compareAndSwap`) | `@di-framework/repo` |
| Blob storage | `InMemoryBlobStorageAdapter` | `@di-framework/repo` |
| SQLite | `:memory:` database or a temp file with `MigrationRunner({ db, migrations })`; `autoApply()` only runs when `NODE_ENV` is `development` or `test`; there is no rollback | `@di-framework/repo` |
| HTTP | No client needed. `await router.fetch(new Request(url, init))`. POST/PUT bodies need `content-type: application/json` or the router returns 415. | `@di-framework/http` |
| RPC | `memoryPair({ delayMs? })` → `{ clientTransport, serverTransport }` | `@di-framework/rpc/memory` |
| Events | `memoryTransport({ delayMs? })` for `@EventBridge` | `@di-framework/events/memory` |
| In-process pub/sub | Subscribe a test `@Subscriber` or `container.on(...)` and assert the payload | `@di-framework/core` |
| Telemetry | `container.on('telemetry', listener)`; keep the returned unsubscribe | `@di-framework/core` |
| Queues | `InMemoryQueueBackend` with its own clock: `now()`, `advanceTime(ms)`, `step(queue, handler)`, `drain(...)` | `@di-framework/queues` |
| Cron | No fake cron clock. `container.invokeCronJob(jobId)`, then `CronRuntime.reset()` in `afterEach` | `@di-framework/core` |
| Service bindings | `registerValue(serviceBindingToken('inventory'), fake)`; or `LocalServiceDevManager.substituteMock(name, mock, caller?)` from `@di-framework/core/service-bindings`. `grantAccess: false` yields `UnboundCallerError` | `@di-framework/core` |
| Config | `objectSource({...})`, `envSource({ prefix, env: {...} })` (no `process.env` mutation), `setSelectedProfiles([...])` (reset it in `afterEach`), `registerConfig(cfg, { token, container })`. There is no built-in `test` profile. | `@di-framework/config` |
| Actors | `new ActorRuntime({ storage, actors })`, call through `runtime.get(...)`, never a plain instance. `SqliteActorStorage.temporary()` or `InMemoryActorStorage`; `await runtime.clear()` in `finally`. Adapter conformance: `defineActorContractSuite` from `@di-framework/actors/testing` (imports `bun:test`; tests only). | `@di-framework/actors` |
| Auth | `InMemoryClientStore`, `InMemoryAuthCodeStore`, `InMemoryConsentStore`, `InMemoryOAuthTokenStore`; strategies returning `authenticated` / `noCredential` / `authFailed` | `@di-framework/auth/server` (stores), `@di-framework/auth` |
| Sockets | `createMemoryDuplexPair()` | `@di-framework/socket` |

Working samples in the public `examples` repository (see [discovery.md](discovery.md)):

- HTTP through `fetch`: `framework/http-router/index.test.ts`
- Re-registering decorated classes after `clear()`: `framework/services/services.test.ts`
- Config sources in tests: `framework/config/index.test.ts`
- Actors with temporary SQLite storage: `framework/counter-actor/counter.actor.test.ts`

Docs: `testing.html` on the versioned docs site, plus the testing sections of `actors`, `queues`, `scheduling`, and `service-bindings`. The docs' mocking sample registers `MockDatabaseService` beside `UserService`; that only substitutes if the consumer injects that token. Use `registerValue(RealToken, fake)`.

Choose doubles using [the engineering taxonomy](../../principled-engineering/references/test-doubles-taxonomy.md) and [boundary guidance](../../principled-engineering/references/test-doubles-uncle-bob.md).
