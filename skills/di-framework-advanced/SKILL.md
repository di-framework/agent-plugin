---
name: di-framework-advanced
description: Apply advanced di-framework container patterns from the docs site. Use for transient services, registerFactory, forks, container events, construct overrides, conditional registration, @Publisher, or @Telemetry.
---

# Advanced usage

Source: <https://docs.di-framework.dev/advanced-usage.html>. For a 6.0.x install, prefer the `v6.0` snapshot. Baseline composition is the `di-framework-core` skill. Repository types on that page are the `di-framework-repo` skill.

Pick the smallest mechanism that matches the need:

| Need | API |
| --- | --- |
| New instance per resolve | `@Container({ singleton: false })` or `register(Service, { singleton: false })` |
| Env, third-party client, or a branch on environment | `registerFactory(token, () => value, { singleton })` and `@Component('token')` |
| Tenant or request copy of a seeded container | `container.fork({ carrySingletons: true })`, then register request-only factories on the fork |
| Separate plugin or test world | `new Container()` from `@di-framework/core/container`, passed as `@Container({ container })` |
| One-off instance plus literal constructor args | `container.construct(Class, { index: literal })` |
| Cross-service notification inside the process | `@Publisher({ event, phase: 'after' })` and `@Subscriber('event')` |
| Method timing | `@Telemetry({ logging })` and a `@TelemetryListener()` method |
| Resolve metrics | `container.on('resolved' \| registration events)` and call the unsubscribe function |

`fork()` copies registrations. `carrySingletons: true` reuses existing singleton instances (database pools). It is not a parent scope: later parent registrations do not appear on the fork, and factories close over the container they captured.

`@Publisher` / `@Subscriber` are in-process. Payloads include class, method, args, timing, result, and error. Kafka or NATS bridging is `@di-framework/events`. Sockets are `@di-framework/socket`.

`setEnv` / `setCtx` on a service are ordinary methods. The container does not call them. Prefer `@di-framework/config` or an explicit factory.

Conditional registration (`registerFactory` chosen from the environment) happens once at startup, before resolve. Do not register a second implementation of the same token later in the request.

Scheduling (`@Cron`) is a separate topic: <https://docs.di-framework.dev/scheduling.html>. On a wasmCloud deploy, read `di-framework-platform` before assuming in-process timers fire.
