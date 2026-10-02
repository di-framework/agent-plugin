---
name: di-framework-actors
description: Define, register, persist, migrate, and invoke @di-framework/actors virtual actors. Use for @Actor, ActorRuntime, actor mailboxes, SQLite actor storage, or di-framework actor list/inspect/reset.
---

# Actors

`@di-framework/actors` is a local virtual-actor runtime. It does not require Wasm. Inspect the resolved version; the sibling checkout publishes **6.0.3**. Guide: <https://docs.di-framework.dev/actors.html>. wasmCloud placement, replicas, and volumes are the `di-framework-platform` skill. Example: `examples/framework/counter-actor` and `examples/platform/wasmcloud-actor-counter`.

```bash
bun add @di-framework/actors @di-framework/core
```

The default entry imports `bun:sqlite` via `SqliteActorStorage`. Tests in this package run on Bun. For a graph without `bun:sqlite`, import `@di-framework/actors/portable` and use in-memory storage. Do not import `@di-framework/actors/testing` from production code.

## Define and call

There is no implicit container activation. Register classes on an `ActorRuntime` (or the process `actors` singleton), then `runtime.get(ActorClass, actorKey)`.

`@Actor({ name?, namespace?, migrations? })` defaults the name to the class. `@ActorMethod({ name?, timeout? })` exposes a mailbox method. Inject context with the `@ActorContext` property decorator or `ActorContext.current()`. Durable data goes through `ctx.storage`. Instance fields are scratch space and die with the activation.

`onActivate` / `onDeactivate` are optional hooks. Pending `@Actor({ migrations })` run before activation, reusing the `@di-framework/repo` runner with `binding` equal to the actor type. A failed migration refuses activation.

Identity is `` `${namespace}:${name}:${actorKey}` `` when a namespace is set on the decorator, `register()`, or `ActorRuntime({ namespace })`. Default metadata namespace `'default'` does not prefix identity by itself. Duplicate names in one runtime are unambiguous by class or `namespace:Name`; a short-name lookup throws `ActorAmbiguityError`.

## Concurrency

Invocations of one actor key run one at a time, including across `await`. Different keys run concurrently. Calling the same actor through its reference from an active invocation rejects as reentrancy. Call `this.otherMethod()` to share the current invocation and transaction. Indirect cycles (A→B→A) also reject while the earlier call is active.

A method timeout rolls back storage and discards the instance, but it cannot cancel JavaScript already running. Late storage access rejects. Clearing a mailbox rejects queued calls. Startup and `reload()` never delete SQLite files. Reset only through `runtime.reset(...)` or `di-framework actor reset|clean`.

`reload({ policy: 'drain' | 'fail', timeoutMs, actors })` stops admission, drains or fails queued work, releases locks, reapplies migrations, and keeps committed files.

## Storage and CLI

```typescript
const storage = new SqliteActorStorage({ baseDir: './.actors' });
const runtime = new ActorRuntime({ storage, namespace: 'app-a' });
runtime.register(BankAccountActor);
```

File locking is single-writer per database file. Tests use `SqliteActorStorage.temporary()` or `{ inMemory: true }`, then `runtime.clear()` and `storage.close()`. In-memory mode keeps one database per actor id until `close()`.

```bash
di-framework actor list [--namespace <name>] [--dir <path>] [--active]
di-framework actor inspect <actorType|identity> [--key <key>] [--show-state]
di-framework actor reset --actor <name> [--key <key>] [--namespace <name>]
di-framework actor reset --all
```

`--show-state` prints private committed state. Omit it unless the user asked to see that state.

Discover classes with `discoverActorClasses({ rootDir: 'src' })` and `generateActorRegistration`. On a wasmCloud guest, `SqliteActorStorage` becomes the Wasm backend, `fileLocking` is ignored, and exclusive write is `replicas: 1` on the workload. Read `di-framework-platform` before deploying.
