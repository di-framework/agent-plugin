---
name: di-framework-core
description: Apply first-principles di-framework application patterns with @di-framework/core. Use when structuring an app, choosing Container versus ApplicationContext, wiring constructor injection, lifecycles, forks, or startup.
---

# Core application patterns

Inspect the resolved `@di-framework/core` version, lockfile, and `experimentalDecorators` before editing. The latest release is **6.0.3**, and the bundled container examples in `di-framework-api` are verified against it. For another release, read that release's public types. Docs snapshot for 6.0.x: <https://docs.di-framework.dev/v6.0/>. Registration diagnostics stay in the `di-framework-api` skill (`di_inspect_graph`, `di_scaffold_provider`).

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

Configuration belongs in `@di-framework/config` (`@Configuration`, `@Value`, `loadAndRegisterConfig`), not scattered `process.env` reads. Read `di-framework-advanced` when the app needs factories, forks, or events.

## Isolation

`fork()` copies registrations and resets singleton caches unless `carrySingletons` is true. It is not a parent-linked scope. Factory closures keep the container they captured. Tests construct `new Container()` (imported as a value from `@di-framework/core/container`, aliased if it collides with the decorator) and `register` / `registerValue` the doubles they need. Do not share the global container across tests.

`container.construct(Class, { index: literal })` builds one instance and overrides constructor arguments by index. It does not register that instance.

Class-name aliases can cache a different instance from the constructor key in 6.0.x. Resolve class registrations by constructor.
