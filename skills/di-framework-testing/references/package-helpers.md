# Test doubles shipped by framework packages

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

Working samples in the public `examples` repository (see `di-framework-examples`):

- HTTP through `fetch`: `framework/http-router/index.test.ts`
- Re-registering decorated classes after `clear()`: `framework/services/services.test.ts`
- Config sources in tests: `framework/config/index.test.ts`
- Actors with temporary SQLite storage: `framework/counter-actor/counter.actor.test.ts`

Docs: `testing.html` on the versioned docs site, plus the testing sections of `actors`, `queues`, `scheduling`, and `service-bindings`. The docs' mocking sample registers `MockDatabaseService` beside `UserService`; that only substitutes if the consumer injects that token. Use `registerValue(RealToken, fake)`.
