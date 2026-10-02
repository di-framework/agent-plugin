# Building with di-framework

di-framework is declarative. Describe each service and what it needs with decorators; the container builds, wires, and caches the graph. Companion packages handle common application concerns the same way. Write application code in that style and reach for a framework package before hand-rolling infrastructure.

## Before you change code

- Read the installed `@di-framework/*` versions from `package.json` and the lockfile. Keep every framework package on one release; mixed releases load two containers.
- `tsconfig.json` needs `experimentalDecorators: true` and `emitDecoratorMetadata: false`. Never import `reflect-metadata`.
- Look up APIs with `di_search_docs` and `di_window` for the installed version, and load the matching `di-framework-*` skill for task detail. Do not guess decorator options or CLI flags.

## Services

- A service is a class marked `@Container()`. It is a singleton by default; use `@Container({ singleton: false })` only for state that must not be shared.
- Declare required collaborators as constructor parameters: `constructor(@Component(UserRepository) private readonly users: UserRepository)`. TypeScript types alone do not inject. Use property `@Component` only for optional collaborators.
- Inject concrete classes by default; tests replace them under the same class token. Use a string token for configuration values and connections, or for a port with several implementations. Bind the token with `@Bean('token')` in a core `@Configuration()` class.
- Do not `new` services, build graphs by hand, or call `useContainer()` inside business logic. Resolve only at entry points: the startup module, static route handlers, and tests.
- Import framework code by scoped package id (`@di-framework/core/decorators`, `@di-framework/core/container`). Relative or unscoped paths load a second container.
- Break dependency cycles by extracting the shared collaborator. Do not hide them with property injection.
- One class, one job; group code by feature (`src/features/<name>/`).

## Startup

Start the app with `ApplicationContext.builder().configuration(...).bootstrap(Server)`, then `await app.start()`. Long-lived components implement `start()` and `stop()`. Resolving the graph at startup surfaces a missing registration before the first request. `@Bootstrap()` is deprecated.

## Use the framework's packages

| Need | Use |
| --- | --- |
| HTTP API | `@di-framework/http`: `TypedRouter`, `HttpRouter.builder()`, `@Controller` / `@Endpoint`, OpenAPI with `di-framework http openapi generate` |
| Static files, SPAs | `HttpRouter.builder().static()` |
| Settings | `@di-framework/config`: `@Configuration` / `@Value`, env and file sources, profiles. Services never read `process.env`. |
| Persistence | `@di-framework/repo`: `@Repository`, `@Model` / `@Id`, storage adapters, migrations |
| Authentication, authorization | `@di-framework/auth` (`registerAuth`; `requireAuth` from `@di-framework/auth/http`), `@di-framework/authz` (`@Policy`) |
| In-process events | `@Publisher` / `@Subscriber`; Kafka or NATS via `@di-framework/events` (`@EventBridge`) |
| Background work, schedules | `@QueueHandler` with `@di-framework/queues`; `@Cron` |
| Per-entity state | `@di-framework/actors` (`@Actor`) |
| GraphQL, RPC, sockets | `@di-framework/graphql`, `@di-framework/rpc` (`@RpcService`), `@di-framework/socket` (`@SocketGateway`) |
| One contract over several transports | `@di-framework/codegen` with `di-framework generate`. Never edit generated files. |
| Input checks | `@di-framework/tsc` runtime guards (wired by `di-framework init`), plus validation at the boundary |
| Calls between deployed services | `@ExportService` / `@ServiceBinding` |
| LLM features | `@di-framework/ai`, `@di-framework/ai-utils` |

Add a package with the same version as the installed core before using it.

## Toolchain

- Bun is the runtime and package manager. Start new apps with `bun x @di-framework/cli init <name>`.
- `di-framework check` and `di-framework build` compile through `ttsc` with the `@di-framework/tsc` transform. `bun run dev` runs source without those runtime guards.
- `di-framework` is the only CLI. `platform` and `ai` are extensions (`di-framework extensions install <name>`). Confirm commands with `--help` on the installed binary.

## Tests and done

- Use `bun:test`. Build a fresh `Container` per test (or `useContainer().clear()` and re-register), and `registerValue(Token, fake)` under the token the consumer injects.
- Exercise HTTP in process with `router.fetch(new Request(...))`.
- `di_inspect_graph` and `di_validate_tokens` are hints. A test that resolves the real graph is the proof.
- A change is done when `di-framework check`, `bun test`, and `di-framework build` pass and a real request to the running app behaves as intended.
