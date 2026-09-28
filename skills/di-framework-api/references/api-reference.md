# Core 6.0.1 reference

Verified against the [tagged implementation](https://github.com/di-framework/di-framework/blob/v6.0.1/packages/di-framework-core/container.ts)
and published `@di-framework/core@6.0.1` declarations and runtime.
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

`@Container({ container?, singleton? })` from the decorators subpath registers a class
in the chosen container (global by default). `@Component(ClassOrString)` supports
constructor parameters and properties. `@Configuration()` and `@Bean()` declare
factory beans with explicit dependencies. Global `useContainer()` is supported; follow the
application's container convention and avoid mixing distinct installed core copies.

Class and class-name registration keys in 6.0.1 can cache separate instances. `register`
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

`@Bootstrap()` still runs at class-definition time and is deprecated; new startup code
uses `ApplicationContext`. Resolving an unregistered `service-binding:<name>` token
synthesizes a singleton factory. That synthesis, cron jobs, and configuration graphs
are outside the static inspector.
