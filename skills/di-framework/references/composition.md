# Core application patterns

Inspect the resolved `@di-framework/core` version, lockfile, and `experimentalDecorators` before editing. Bundled container examples are verified against **6.0.3**. For another release, read that release's public types. Docs snapshot for 6.0.x: <https://docs.di-framework.dev/v6.0/>. For registration diagnostics, see [diagnostics.md](diagnostics.md).

Import the container from `@di-framework/core` or `@di-framework/core/container`, decorators from `@di-framework/core/decorators`, and startup from `@di-framework/core/application-context`. Always use the scoped package id. A relative import or an unscoped `di-framework/*` id loads a second container.

Decorators need `experimentalDecorators: true`. Do not import `reflect-metadata`. `emitDecoratorMetadata` is not required.

## Composition

A service is a class marked `@Container()` (singleton by default) or registered with `container.register(Service)`. Mandatory collaborators are constructor parameters decorated with `@Component(Token)`. TypeScript types alone do not inject. Property `@Component` is for an optional collaborator, not the main graph.

Use class constructors or string tokens. Prefer constructor injection and explicit factories over a hidden global lookup inside business methods. `useContainer()` is for composition roots, static handlers, and tests.

Keep one installed core instance. Organize by feature: a feature folder holds the service, its repository, and its HTTP or GraphQL entry. Each class has one job. Break cycles by extracting the shared collaborator; do not paper over them with property injection.

Stateless services stay singletons. `{ singleton: false }` is for state that must not leak across calls. Request-specific values belong on an explicit fork or factory, not on a process-wide mutable singleton.

## Startup

Prefer `ApplicationContext` with `@Configuration()` and `@Bean()`. Bean dependencies are listed explicitly. Async factories are awaited during `start()`. `Container.resolve()` stays synchronous.

```typescript
import { ApplicationContext } from '@di-framework/core/application-context';
import { Bean, Configuration } from '@di-framework/core/decorators';

@Configuration()
class AppConfiguration {
  @Bean()
  port() { return 8080; }

  @Bean('serverUrl', { dependencies: ['port'] })
  async serverUrl(port: number) { return `http://localhost:${port}`; }
}

const app = ApplicationContext.builder().configuration(AppConfiguration).bootstrap(HttpServer);
await app.start();
await app.stop();
```

Bootstrap components may implement `start()` and `stop()`. Successful components stop in reverse startup order. `@Bootstrap()` still resolves at class-definition time and is deprecated in 6.0.x. Resolve the composition root at process start so missing registrations fail before traffic.

Configuration belongs in `@di-framework/config` (`@Configuration`, `@Value`, `loadAndRegisterConfig`), not scattered `process.env` reads. Factories, forks, and events are covered below.

## Test isolation

Tests use `new Container()` from `@di-framework/core/container` (alias it when the decorator name collides), register the real classes, and `registerValue` the needed doubles. Do not share the global container across tests. One-off `construct` overrides do not register an instance; fork and key-identity caveats are below.

## Registration API and 6.0.3 limits

Verified against the [tagged implementation](https://github.com/di-framework/di-framework/blob/v6.0.3/packages/di-framework-core/container.ts)
and published `@di-framework/core@6.0.3` declarations and runtime.
Versioned narrative docs are at <https://docs.di-framework.dev/v6.0/>.

| API | Behavior |
| --- | --- |
| `new Container()` | Independent container |
| `register(Service, { singleton?: boolean })` | Registers a class; singleton defaults to true |
| `registerFactory(token, () => value, options?)` | String or constructor token; factory receives no container argument |
| `registerValue(token, value)` | Registers an existing value, including undefined |
| `resolve(Service)` / `resolve<T>('token')` | Resolves or throws for an unregistered token |
| `construct(Service, { 0: value })` | Fresh construction with indexed constructor overrides |
| `has(token)` | Registration presence |
| `fork({ carrySingletons?: boolean })` | Copies registrations, optionally carrying already-created singleton instances |
| `clear()` | Clears registrations/listeners and stops container cron jobs |
| `ApplicationContext.builder()` | Explicit startup: `.configuration()`, `.bootstrap()`, `start()`, `stop()` |
| `setCronMode` / `invokeCronJob` / `getCronJobs` | In-process or external cron; external mode suppresses in-component timers |

`@Container({ container?, singleton? })` chooses a container (global by default). Follow the application's container convention and avoid mixing installed core copies.

Class and class-name registration keys in 6.0.3 can cache separate instances. `register`
stores the constructor and `Class.name` as two definitions. Resolve consistently using
the same key, preferably the constructor for class registrations.
A fork has no parent lookup and does not inherit later registrations. Factory closures
still refer to their original container after a fork; register fork-specific factories
on the fork if isolation is required. `carrySingletons` shares only already-cached values.
There is no built-in scoped lifecycle, disposal protocol, `createToken`, `Lifecycle`,
provider-object registration, `resolveOptional`, or `createChildScope` in this release.

Constructor injection fails on missing explicit dependencies. Property injection catches
resolution failures and warns; use constructor injection or an explicit factory when a
missing dependency must fail construction. Circular resolutions throw; remove the cycle
or provide an explicit deferred boundary appropriate to the application.

Resolving an unregistered `service-binding:<name>` token
synthesizes a singleton factory. That synthesis, cron jobs, and configuration graphs
are outside the static inspector.

Run [container-patterns.ts](../examples/container-patterns.ts) with Bun and legacy decorators enabled to exercise constructor injection, factories, identities, and forks.

## Other container mechanisms

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

`@Publisher` / `@Subscriber` are in-process. Payloads include class, method, args, timing, result, and error. Kafka or NATS bridging is `@di-framework/events`. Sockets are `@di-framework/socket`.

`setEnv` / `setCtx` on a service are ordinary methods. The container does not call them. Prefer `@di-framework/config` or an explicit factory.

Conditional registration (`registerFactory` chosen from the environment) happens once at startup, before resolve. Do not register a second implementation of the same token later in the request.

Scheduling (`@Cron`) is a separate topic: <https://docs.di-framework.dev/scheduling.html>. On a wasmCloud deploy, read [platform.md](platform.md) before assuming in-process timers fire.

Source for additional mechanisms: <https://docs.di-framework.dev/advanced-usage.html>; prefer the `v6.0` snapshot for 6.0.x.
