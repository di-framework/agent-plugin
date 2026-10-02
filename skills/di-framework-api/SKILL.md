---
name: di-framework-api
description: Design, register, inject, or troubleshoot services and container lifecycles in di-framework applications.
---

# Dependency injection

Bundled guidance and executable examples support **@di-framework/core 6.0.3**.
Before editing, inspect the target package's installed package metadata and lockfile;
a manifest range is not a resolved version. Check its TypeScript/decorator configuration.
For another release, report that these examples are unverified and consult that release's
public types and tagged source before adapting them. Do not silently substitute latest.
Documentation for this release is the `v6.0` snapshot at <https://docs.di-framework.dev/v6.0/>.

Application shape (composition root, constructor injection, startup, test
containers) is the `di-framework-core` skill. This skill is the registration
and diagnostic surface.

Import `Container` from `@di-framework/core` and decorators from
`@di-framework/core/decorators`. Register classes with `container.register(Service)`;
singleton is the default, `{ singleton: false }` makes resolutions transient.
Use class constructors or string tokens. Inject explicit `@Component(Dependency)`
constructor parameters with `experimentalDecorators: true`, or use an arrow factory
that explicitly resolves dependencies. TypeScript types alone do not guarantee injection.

Explicit application startup uses `ApplicationContext` from
`@di-framework/core/application-context` with `@Configuration()` and `@Bean()`.
Bean dependencies are declared explicitly, and async factories are awaited while
`Container.resolve()` stays synchronous. `@Bootstrap()` still resolves at
class-definition time and is deprecated in 6.0.3.

Start with [the runnable quick start](examples/container-patterns.ts). It exercises
constructor injection, factories, singleton/transient identity, and fork behavior.
Run it in a project with the pinned core package using Bun and legacy decorators enabled.
See [the API reference](references/api-reference.md) for lifecycle caveats and source links.

`di_scaffold_provider` generates a `@Container()` service class. Pass the target's
resolved `frameworkVersion`; the scaffold supports 6.0.3 (default) and 6.0.1.
Use `di_inspect_graph` for static source diagnostics. `di_validate_tokens` checks only
caller-supplied registration assertions. Dynamic registration, module initialization,
ApplicationContext graphs, cron, service-binding proxies, and factories outside the
analyzed forms require runtime tests.
A clean partial analysis does not prove the application resolves correctly.

For additional APIs, call `di_search_docs` with the resolved version, then `di_window`
with the same version and returned topic/cursor. Check returned provenance; if that
version is unavailable, use tagged source instead of treating latest as compatible.
6.0.3 resolves to the `v6.0` documentation snapshot.

When adding support for a release, compare its published declarations and implementation,
update this skill, reference, examples, scaffold and distributed rules together, and run
the examples and generated scaffold through typechecking and behavior tests against that
exact dependency version before declaring support.
