---
name: di-framework-repo
description: Persist entities with @di-framework/repo, implement custom storage adapters, and run migrations. Use for Repository, StorageAdapter, SQLite migrations, or PostgreSQL schema changes through a wasmCloud Postgres binding.
---

# Repositories

`@di-framework/repo` is the storage boundary. Business services depend on a repository, not a driver. Inspect the resolved version; the sibling checkout publishes **6.0.3**. Guide: <https://docs.di-framework.dev/repositories.html>. Peer `@di-framework/core` only when using `@Repository`. Import core as `@di-framework/core/*`.

## Models and repositories

`@Model()` plus `@Id()` describes identity. `@GeneratedValue` stacks on the same property. `GenerationType.UUID` means UUIDv7, not v4. `IdKind` is `Primary` (default), `Public`, `External`, `Legacy`, `Tenant`, or `Version`. Foreign keys are not an `IdKind`. Metadata is optional; repositories still take an explicit id type (`InMemoryRepository<User, number>`).

| Class | Use |
| --- | --- |
| `InMemoryRepository` | Prototypes and tests. |
| `BaseRepository` / `EntityRepository` | Your adapter behind the standard API. |
| `SoftDeleteRepository` | Entities that implement `SoftDeletable`. |
| `@Repository()` | Registers a singleton in the core container. |

Built-in SQL adapters (`BunSqliteAdapter`, `D1Adapter`, and `SqlStorageAdapter`) map an existing table. They do not migrate. Pass `table`, and `idColumn` / `entityToRow` / `rowToEntity` when the row shape differs. D1 transactions stay inside the callback. Bun adapters close in `dispose()`; D1 `dispose()` is a no-op.

`ConditionalStorageAdapter` adds `saveIfAbsent` and `compareAndSwap`. Detect it with `supportsConditionalWrite`. The built-in adapters implement it. A custom adapter does not, unless you add those methods.

Blob bytes use `BaseBlobRepository` with `InMemoryBlobStorageAdapter` or `S3BlobStorageAdapter` (S3, R2, MinIO). That is a different contract from `StorageAdapter`.

## Custom storage adapters

Implement `StorageAdapter<E, ID>`: `findById`, `findMany`, `findAll`, `save`, `delete`, `findPaginated`. Add `count`, `exists`, `transaction`, and `dispose` when the backend can do them. `findPaginated` returns `{ items, total, page, size, pages }`. Filter and sort strings are adapter-defined.

```typescript
class PostgresAdapter<E, ID> implements StorageAdapter<E, ID> {
  // findById, save, delete, findPaginated, ...
}

@Repository()
class ProductRepository extends EntityRepository<Product, string> {
  constructor() {
    super(new PostgresAdapter<Product, string>());
  }
}
```

Keep SQL, placeholders, and connection ownership inside the adapter. Repositories add queries and invariants. Do not call `MigrationRunner` from `save`.

## SQLite migrations

`MigrationRunner` and `di-framework migrations` speak SQLite. `createMigrationDatabase` accepts a `SqlDatabase`, a filesystem path, `:memory:`, `bun:sqlite`, `node:sqlite`, or the Wasm SQLite import. It does not open PostgreSQL.

Sources merge: `@Migration({ version, description, binding? })` classes (imported so they register; `binding` defaults to `'default'`), `*.sql` files, and a JSON manifest. The runner constructs `new Target()` with no arguments. `up` runs; `down` is stored and never executed. History is `_migrations`, keyed by `(version, binding)`, with `_migrations_lock` (60s steal). Each successful `up` is one `db.transaction`. Checksums reject edited applied migrations. A pending version older than the latest applied throws `MigrationOrderError`.

`autoApply()` runs only when `NODE_ENV` is `development` or `test`, unless `enabled: true`. Application bootstrap does not call it. Actor activation does, with `binding` set to the actor type.

```bash
di-framework migrations status --db ./dev.db --dir ./migrations --module ./src/migrations.ts
di-framework migrations execute --db ./dev.db --dry-run
```

`--db` defaults to `DATABASE_URL`, then `DB_PATH`, then `./dev.db`. That value is a SQLite path. Binding mismatch exits `2`. Connect or runner failures exit `1`. SQLite will not roll back every DDL statement even inside a transaction. wasmCloud build does not scan `@Migration` classes; actor migrations run in the guest before activation.

## PostgreSQL

Do not point `MigrationRunner` or `di-framework migrations --db` at a Postgres URL or a `Postgres` binding. The runner's history SQL uses SQLite `?` placeholders and a SQLite transaction handle. The wasmCloud binding is a different API.

Schema changes on `@di-framework/bindings` `Postgres` go through `queryBatch(sql)`:

- One batch holds one connection. Statements that must observe each other belong in a single batch string.
- Write PostgreSQL dialect (`serial` / `generated`, `text`, no `AUTOINCREMENT`, no SQLite `?` inside the batch).
- `query(sql, params)` is the parameterized call. The verified kube path for multi-statement DDL is `queryBatch`, not streamed `query` or prepared statements.
- A raw WIT guest may return `{ tag: 'err' }` instead of throwing. Treat that variant as failure before recording the change as applied.
- The unlabeled QuickJS import does not support multiple independently credentialed databases. Dedicated instances use `serviceName` on the binding. Read `di-framework-platform`.

Track applied versions yourself if you need history on Postgres (a `schema_migrations` table updated in the same batch as its DDL). The SQLite `_migrations` tables are not created for you on that binding. Example of the batch style: `examples/platform/kube-apps/apps/postgres`. SQLite migration example: `examples/platform/kube-apps/apps/schema-migrations`.
