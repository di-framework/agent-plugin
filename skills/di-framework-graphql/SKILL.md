---
name: di-framework-graphql
description: Build decorator-driven GraphQL APIs with @di-framework/graphql. Use for SemanticType, Portal, Field, Action, bounded contexts, schema build, or mounting a GraphQL handler on di-framework HTTP.
---

# GraphQL

Domain classes are the schema. There is no SDL file to maintain and no resolver map. Inspect the resolved `@di-framework/graphql` and `@di-framework/core` versions; the sibling checkout publishes **6.0.3**. Guide: <https://docs.di-framework.dev/graphql.html>. Example: `examples/framework/graphql`. Container rules are the `di-framework-core` skill.

```bash
bun add @di-framework/graphql @di-framework/core graphql
```

`graphql` is an optional peer, required only to execute. `@di-framework/graphql/core` (decorators, registry, type graph, SDL printer) works without it. Decorators need TypeScript 5 and `experimentalDecorators`. Do not turn on `emitDecoratorMetadata` for this package; types are runtime markers such as `() => String`, `() => ID`, `() => [Book]`.

## Model

| Decorator | Role |
| --- | --- |
| `@SemanticType` | Object type. `key` is always exposed. `boundary: true` requires `key`. `expose` publishes constructor parameter properties. |
| `@Portal` | Root object. `@Field` → Query, `@Action` → Mutation, `@Subscription` → Subscription. Not a field type. |
| `@Field` / `@Action` | Instance methods. Behavior stays on the object that owns the invariant. |
| `@Lookup` | **Static** loader used before an entity `@Action` runs. |
| `@BoundedContext('Name')` | Ownership. Cross-context references require `boundary: true` or `buildSemanticSchema` throws `SemanticBoundaryError`. |
| `@Extends(() => Type)` | Adds fields to another context's boundary type. Parent arrives via `@Parent()`. |

An `@Action` on a semantic type becomes a root mutation `<type><Method>` with an implicit key argument (`keyArg` renames it). The runtime loads the entity through `@Lookup` first. A method with no return marker returns the entity; `@Action(() => Receipt)` returns that type.

`@Field({ batch })` coalesces that field across parents in the same tick. The batch method receives the parent list. No DataLoader package.

Hydration wraps plain repository rows in the class before resolution, so method fields see instance state. Portals and extensions are container classes: inject collaborators with constructor `@Component`.

```typescript
const api = buildSemanticSchema(); // or { contexts: ['Catalog', 'Reviews'] }
await api.execute({ query: '{ book(id: "b1") { title } }' });
const handler = createGraphQLHandler(api);
mountGraphQL(router, api, { path: '/graphql' });
```

`api.sdl`, `api.schema` (graphql-js), and `api.graph` are the three views. If no portal declares a query, the schema synthesizes `_contexts`.

Subscriptions pair with core `@Publisher`. The publishing service does not import GraphQL. Print SDL from `@di-framework/graphql/core` in architecture tests so they do not need the `graphql` package.

`@Lookup` and pure schema helpers are static. `@Field` and `@Action` stay instance methods. The package README states that split.
