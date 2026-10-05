# Design patterns

Read the app's existing structure first and extend it; do not add a second architecture beside it. Container mechanics are in [composition.md](composition.md).

[assets/orders/](../assets/orders/) is a complete, tested feature slice to copy and rename:

| File | Pattern |
| --- | --- |
| `domain/order.ts` | Model, port interface + string token, `OrderError` with a status. No framework imports. |
| `application/order-service.ts` | `@Container()` use cases injecting ports; validation, transaction, idempotency key, pay-once. |
| `infrastructure/in-memory-order-store.ts` | Adapter implementing the port over `InMemoryRepository`. |
| `http/order-routes.ts` | `TypedRouter`; request → command, `OrderError` → status in `catch`. |
| `composition.ts` | `@Configuration()` class whose `@Bean(ORDER_STORE)` binds the port to its adapter. |
| `orders.test.ts` | Fresh container plus `ApplicationContext` with the real beans and a fake payments port, exercised through `router.fetch`. |

## Structure

- **Feature slices.** `src/features/<feature>/` with `domain/`, `application/`, `infrastructure/`, and `http/` once the feature has storage; a single file per role is fine before that. Shared code goes in `src/shared/`, not a cross-feature `utils`.
- **Dependencies point inward.** Routes call services; services call ports; adapters implement ports. Services never see `Request`/`Response`, SQL, or a driver.
- **Declarative wiring.** Services are `@Container()` classes with `@Component` constructor parameters; the container builds the graph. Token bindings live in `@Configuration()` classes with `@Bean`, and `ApplicationContext.builder().configuration(...).bootstrap(...)` starts the app. Nothing calls `new` on a service, and business methods never call `useContainer()`.

## Ports and adapters

Inject concrete classes by default (`@Component(OrderRepository)`); tests replace them under the class token. Introduce a port only where implementations really vary (payment gateways, storage backends) or the dependency is external. Interfaces vanish at runtime, so a port's seam is a namespaced string token bound by a bean:

```ts
export const PAYMENTS = 'orders.payments';
export interface Payments { charge(customerId: string, amount: number): Promise<boolean> }

@Container()
class OrderService {
  constructor(@Component(PAYMENTS) private readonly payments: Payments) {}
}

@Configuration() // from @di-framework/core/decorators
class PaymentsConfiguration {
  @Bean(PAYMENTS, { dependencies: [StripePayments] })
  payments(stripe: StripePayments): Payments { return stripe; }
}
```

Bean dependencies are listed explicitly, never inferred. Tests `registerValue(PAYMENTS, fake)` instead of loading that configuration. Use `container.registerValue` at startup only for values created outside the container, such as an opened database handle.

## Choosing implementations

There are no `@ConditionalOn*` decorators and no multi-binding or collection injection. Pick in a `@Bean` method from configuration (`@di-framework/config`, `@WithProfile` for `dev.config.yaml` overlays). For ordered alternatives inject an explicit list or a composite, like `chain([...strategies])` in `@di-framework/auth` (first match wins). Per-tenant or per-request graphs use `container.fork()`.

## Request pipeline

Cross-cutting concerns belong in router middleware: `HttpRouter.builder().use(...).catch(...)` or per-route `{ use: [requireAuth(...), requireAuthz(...)] }`. A guard returns a `Response` to short-circuit. Authenticate, then authorize, then parse the body. Resource rules are `@Policy` classes in `@di-framework/authz` (deny by default). Read [http.md](http.md).

## Errors and results

The framework has no generic `Result` type or problem+json helper. Throw a domain error that carries a status (`OrderError(404, ...)`) or return a small result object, and convert it in exactly one place: the router `catch`. Map storage errors in the adapter (unique violation → 409). Unknown errors become a generic 500 without driver messages or stacks.

## Validation

Validate at the boundary: codegen `validate<Schema>` for contract-first APIs ([codegen.md](codegen.md)), `@di-framework/tsc` parameter guards for typed signatures ([toolchain.md](toolchain.md)), and zod via `@di-framework/config/zod` for configuration. TypeScript types alone do not check input. Services still enforce their own invariants.

## Consistency and side effects

- **Unit of work.** Writes that must commit together run in one transaction. Give the port a `transaction(fn)`. `BaseRepository.inTransaction` is protected, so wrap it in a repository method.
- **Idempotency.** Accept an `Idempotency-Key`, look it up and record it inside the same transaction, and return the original result on replay. For create-once and optimistic updates use `saveIfAbsent` / `compareAndSwap` (check `supportsConditionalWrite(adapter)`). Read [persistence.md](persistence.md).
- **Events, queues, actors.**

  | Need | Use |
  | --- | --- |
  | In-process notification, loss acceptable | `@Publisher` / `@Subscriber` (core) |
  | Integrate with Kafka or NATS | `@di-framework/events` (`@EventBridge`, `@Outbound`, `@Inbound`) |
  | Work that must happen, with retry and dead letters | `@di-framework/queues` (`@QueueHandler`), at-least-once: make handlers idempotent |
  | Per-entity state under contention | `@di-framework/actors` (serialized mailbox, transactional storage); [actors.md](actors.md) |

  There is no built-in outbox. Write the queue job and the state change in one transaction when both must happen.
- **Multi-tenancy.** `IdKind.Tenant` is metadata only; nothing filters by tenant for you. Scope queries in the adapter or fork a container per tenant.

## Contract-first and service-to-service

For one API served over HTTP, RPC, events, and AI tools, define a codegen manifest and write transport-agnostic `@Container()` handlers ([codegen.md](codegen.md)). Never edit generated files. Between deployed services, use `@ExportService` / `@ServiceBinding` with a shared contract interface ([platform.md](platform.md); sample `examples/platform/checkout-inventory`).

## Avoid

- `@Bootstrap()` (deprecated; use `ApplicationContext`), `reflect-metadata`, and relative or unscoped imports of framework packages.
- Service locators in business code, mutable singletons holding request state, cycles patched with property injection.
- `process.env` outside the configuration layer.
- God services. Keep repository, validation, and orchestration separate.

Prove a design with a test that resolves the real graph with fakes only at the ports ([testing.md](testing.md)).

## Configuration and observation

Use `@di-framework/config` (`@Configuration`, `@Value`, `envSource`, `loadAndRegisterConfig`). Profile overlays use `@WithProfile` (`dev.config.yaml` beside `config.yaml`). Name why a constructor dependency exists when it is not obvious from the type. Observe `container.on('resolved', …)` when diagnosing cache hits or transient churn and unsubscribe afterwards.

Sources: <https://docs.di-framework.dev/best-practices.html> and <https://docs.di-framework.dev/advanced-usage.html>; prefer their `v6.0` snapshots for 6.0.x.

Use [design calibration](../../principled-engineering/references/design-calibration.md), [naming](../../principled-engineering/references/naming-cheatsheet.md), and [SOLID](../../principled-engineering/references/solid.md) when choosing boundaries. Framework registration uses explicit tokens; apply those principles through the existing composition model.
