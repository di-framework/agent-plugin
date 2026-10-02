---
name: di-framework-testing
description: Write and fix tests for a di-framework application with bun:test. Use for container isolation, replacing dependencies with test doubles, testing HTTP routes in process through router.fetch, in-memory repositories, RPC, queues, actors, cron, config, coverage thresholds, or flaky tests caused by shared container state.
---

# Testing a di-framework app

Use Bun's runner (`bun:test`), as the framework and its examples do. If the app already uses another runner, keep it and apply the container rules below. Inspect `bunfig.toml`, the `test` script, and where existing tests live, then match them.

Start from [assets/feature.test.ts](assets/feature.test.ts). It is verified against the published 6.0.3 packages and shows a fresh container per test, a port replaced with `registerValue`, an `InMemoryRepository`, idempotency and failure assertions, and a route exercised through `router.fetch`. Fakes for RPC, events, queues, cron, actors, config, and auth are in [references/package-helpers.md](references/package-helpers.md).

## Container isolation

Pick one approach per suite.

- **Fresh container (preferred).** `import { Container as DIContainer } from '@di-framework/core/container'`. In `beforeEach`, build one, `register` the real classes under test, and `registerValue(Token, fake)` their collaborators. Resolve only from that instance. Decorated classes keep their `@Component` metadata in a new container; only the automatic registration is global.
- **Global reset.** Code that resolves through `useContainer()` (static handlers, `@Controller` classes, module-level routers) needs `beforeEach(() => useContainer().clear())`. `@Container()` registers once, at import time, so re-register what the test needs afterwards (`if (!c.has(X)) c.register(X)`). `clear()` also stops cron jobs and removes listeners.

Substitute under the token the consumer injects. Registering `MockDatabase` changes nothing for a class that injects `DatabaseService`; register the fake as `DatabaseService` (or the string token).

`fork()` copies registrations and resets singleton caches unless `carrySingletons: true`; factories still use the container they captured. `container.construct(Class, { 1: value })` builds one instance with an overridden constructor argument and does not register it.

## What to test

- **Services**: public behavior with fakes at the ports. Assert resulting state (repository contents, returned values). Assert calls only when the call is the contract (charged exactly once).
- **Routes**: build the router from a resolved service and `await router.fetch(new Request(...))`. Do not start `Bun.serve` in unit tests. POST and PUT bodies need `content-type: application/json` or the router answers 415. Cover success, bad input, missing credentials (401), and insufficient permission (403); see `di-framework-http-api`.
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

`bun test --coverage`. Enforce it in `bunfig.toml` with `coverageThreshold = { lines = <ratio>, functions = 0 }`. Leave `functions` at 0, because Bun under-counts decorated constructors. A run that reports `0 fail` but exits 1 is below the threshold: add tests for the reported lines rather than ignore patterns. Hooks and the per-file coverage script are in `di-framework-code-quality`; CI is `di-framework-cicd`.

End-to-end confidence still needs a real request against the running app (`bun run dev`, then `curl`), as `di-framework-create-app` describes.
