# di-framework conventions

These bundled rules support @di-framework/core 6.0.1. Inspect the target project's
resolved package versions, lockfile, and decorator/compiler configuration first. For
other releases, verify public types and versioned documentation before prescribing APIs.
The matching documentation snapshot is <https://docs.di-framework.dev/v6.0/>.

- Register classes with `register(Service, { singleton: true | false })`, factories with
  `registerFactory(token, () => value, options)`, or existing values with `registerValue`.
  Singleton defaults to true. Class constructors and string tokens are supported.
- Import decorators from `@di-framework/core/decorators`. Use explicit `@Component`
  injection or factory arguments; types alone do not establish runtime injection.
- Prefer `ApplicationContext` with `@Configuration()` and `@Bean()` for explicit startup.
  `@Bootstrap()` still resolves at class definition and is deprecated in 6.0.1.
- Follow the application's explicit or global container convention. Static handlers and
  `useContainer()` are supported framework patterns. Keep one installed core instance.
- Resolve class registrations consistently by constructor: class-name aliases may cache
  separate instances in 6.0.1. Avoid accidental registration overrides.
- `fork()` copies registrations and resets singleton caches unless `carrySingletons` is
  true. It is not a parent-linked scope, and factory closures retain captured containers.
  Configure request-specific values and factories explicitly in isolated forks.
- Test required dependency resolution and lifecycle behavior. Static diagnostic tools
  cannot prove dynamic registrations, ApplicationContext graphs, cron, or service-binding
  proxies work; inspect incomplete-analysis diagnostics.
- Search documentation with the resolved version and retain that version when expanding
  windows. 6.0.1 maps to the `v6.0` snapshot. Refresh rules, skills, examples and
  scaffold tests together for new releases.
