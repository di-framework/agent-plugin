---
name: di-framework-best-practices
description: Apply di-framework application best practices from the docs site. Use when reviewing structure, injection style, lifecycles, configuration, circular dependencies, or test isolation.
---

# Best practices

Source: <https://docs.di-framework.dev/best-practices.html>. For a 6.0.x install, prefer the `v6.0` snapshot of that topic. Patterns that the page leaves implicit are the `di-framework-core` skill. Advanced container APIs are `di-framework-advanced`.

Follow these when adding or reviewing application code:

- Decorate services with `@Container()` or register them on the composition root. A plain class is invisible to the container.
- Put mandatory dependencies on the constructor with `@Component(Token)`. Keep property injection for optional collaborators.
- Do not import `reflect-metadata`.
- Depend on a narrow interface when tests must swap the implementation. Inject the concrete class token the container actually registers.
- Leave stateless services as singletons. Use `{ singleton: false }` only for state that must not be shared.
- Resolve the composition root at startup and run connection or config checks there, so a missing registration fails before the first request.
- Load settings with `@di-framework/config` (`@Configuration`, `@Value`, `envSource`, `loadAndRegisterConfig`). Profile overlays use `@WithProfile` (`dev.config.yaml` beside `config.yaml`).
- Group code by feature (`src/features/<name>/` with service, repository, and entry). One class, one responsibility: repository, validator, and orchestrating service stay separate.
- Name why a constructor dependency exists when it is not obvious from the type.
- Remove cycles. Extract the shared service instead of injecting both sides into each other.
- Tests build a new `Container`, register fakes, and resolve from that instance. Do not reuse the process global container across cases.
- Observe `container.on('resolved', …)` when diagnosing unexpected cache hits or transient churn. Unsubscribe with the returned function.

Search further with `di_search_docs` and expand with `di_window` using the same resolved version. Read the `di-framework-docs` skill before treating an unversioned page as compatible with the lockfile.
