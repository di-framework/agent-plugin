# Platform packages

User-facing cluster and deploy commands live in `@di-framework/cli-plugin-platform`.
Read [toolchain.md](toolchain.md) before running `di-framework platform`.
[kube.md](kube.md) installs the same Kubernetes resources through
`@di-framework/platform/existing`; read the [kube.md](kube.md) for that CLI.
Do not add `@di-framework/platform` to an application only to deploy it.

Inspect the resolved package version in the target lockfile. The sibling
checkout publishes **6.0.2**. That version is independent of the application's
`@di-framework/core` version. When the workspace contains the platform
repository, read its README and the package README next to the code you change.
Otherwise use the README shipped with the installed package. Do not treat the
`v6.0` docs snapshot as newer than that README.

| Path | Package | Role |
| --- | --- | --- |
| `platform/platform` | `@di-framework/platform` | Pulumi install: operator, tenancy, admission, backing services |
| `platform/bindings` | `@di-framework/bindings` | Guest WIT bindings and workload metadata |
| `platform/sqlite-component` | `@di-framework/sqlite-component` | `di-framework:sqlite@0.1.0` provider |
| `platform/backup-agent` | `@di-framework/backup-agent` | Dump and restore job image |
| `platform/backup-destination` | `@di-framework/backup-destination` | Tenant backup operator and console |
| `adapters/cloudfoundry` | `@di-framework/cloudfoundry` | `VCAP_SERVICES` / `VCAP_APPLICATION` |

## Bindings

Applications depend on `@di-framework/core` and `@di-framework/bindings`. Put
exported classes in `src/bindings.ts` unless `di-framework.config.json` sets
`bindings`. Names match `/^[a-z][a-z0-9-]*$/`. Inline `config` rejects password,
token, URI, and connection-string values. `secretFrom` defaults to
`<application>-<binding>`. `serviceName` is for a managed backing service and
cannot be combined with `secretFrom`, `configFrom`, or `config`.

| Class | WIT package | Version |
| --- | --- | --- |
| `Postgres` | `wasmcloud:postgres` | 0.2.0 |
| `KeyValue` | `wasmcloud:keyvalue` | 0.2.0 |
| `Blobstore` | `wasmcloud:blobstore` | 0.1.0 |
| `Messaging` | `wasmcloud:messaging` | 0.3.0 |
| `Config` | `wasi:config` | 0.2.0-rc.1 |
| `Secrets` | `wasmcloud:secrets` | 2.1.0 |
| `OutgoingHttp` | `wasi:http` `client` | 0.3.0 |

`WorkloadComponent` and `WorkloadService` declare manifest paths. Paths start
with `/`. `Workload('name')` is a colocation namespace. Unit tests replace a
binding with `registerValue`. An in-memory double does not prove host linking.

For `wasmcloud:postgres`, `wasmcloud:keyvalue`, `wasmcloud:blobstore`,
`wasmcloud:messaging`, and `wasmcloud:secrets`, generated host declarations omit
the name so QuickJS links the unlabeled import. Multiple independently
credentialed PostgreSQL bindings are not supported on that path. Local
`platform dev` reads `WASMCLOUD_POSTGRES_URL` for the host connection.

## Cluster install

`@di-framework/platform/local` is the program generated for an isolated
Docker/k0s cluster. Operate it with `di-framework platform cluster`, from the
workspace root. Default loopback ports are Kubernetes `26443`, registry `25000`,
and HTTP `28180`. Each port is a distinct integer from 1024 through 65535.

`@di-framework/platform/existing` installs the same resources on a caller-owned
cluster. `kubeconfig` is a required local file path. Another Pulumi program that
already owns the cluster calls `createPlatform({ provider, installation })`.

One installation has one project, backend, and stack. Do not create a second
stack for a cluster kube already owns. Preserve `allowSharedHosts: false`,
watched tenant namespaces, and admission protections. Tenant storage uses
single-node host paths. An external cluster must enforce NetworkPolicy itself.
Managed Kubesolo installs a policy-only kube-router controller.

Guides: <https://docs.di-framework.dev/platform.html> and
<https://docs.di-framework.dev/backing-services.html>. For a 6.0.x install, prefer
the `v6.0` snapshot of those topics. Host CLI install is covered in [toolchain.md](toolchain.md).

## Deploy

Run `di-framework platform` directly. Do not wrap it in `package.json` scripts.
Install the extension with `di-framework extensions install platform`
(`@di-framework/cli-plugin-platform`). Confirm flags with `--help`.

A component project has `di-framework.config.json` with `name` and `entry`
(`output` defaults to `dist/<name>.wasm`). The entry default-exports a Fetch
handler or an object with `fetch`. A `TypedRouter` qualifies. `build` writes
the component and disposable `.di-framework/` state. `dev` listens on
`127.0.0.1:8000`. A guest that imports `wasmcloud:*` selects wash.
`WASMCLOUD_POSTGRES_URL` is the local wash Postgres URL.

Workspace-root `di-framework.deploy.toml` declares targets, not applications.
`--target` defaults to `default-target`. `${VAR}` fails when unset or empty.
Do not put credentials in the manifest. `deploy [name]` builds, publishes, and
applies that workload. `destroy [name]` removes that workload only. It does
not run `pulumi destroy`. `cluster up` / `cluster destroy` own the generated
local platform.

A target is one deploy destination. A tenant is `di-tenant-<t>` /
`di-runtime-<t>` / host group `tenant-<t>`. `tenant = "<t>"` fills namespace
and host group unless those fields are set. One Pulumi project, backend, and
stack per installation.

## Backing services

Backing services are `BackingService` resources
(`platform.di-framework.dev/v1alpha1`) in the tenant namespace: `keyvalue`
(Redis), `messaging` (NATS), `blobstore`, `postgres`, and `egress`. Create them
with `di-framework platform service`, which talks to the target kubeconfig.
The controller provisions backends in `di-runtime-<t>`. Do not copy controller
manifests into an app.

```bash
di-framework platform service classes --target alpha
di-framework platform service create postgres --name orders --target alpha --wait
di-framework platform service get orders --target alpha
di-framework platform service delete orders --target alpha
```

Names are lowercase DNS labels of at most 40 characters. `--wait` polls Ready
(default timeout 120s). `deletionPolicy` defaults to `Retain`.

`serviceName` on a binding is PostgreSQL-only. It cannot be combined with
`secretFrom`, `configFrom`, or `config`. `platform deploy` creates that
workload's `ServiceBinding`, waits until Ready, then applies the workload.
The application uses database `app` as user `app`. Blobstore and key-value
projections use `configFrom: 'di-binding-<bindingName>'` and stay unnamed on
the QuickJS import. Egress destinations are `--destination` on
`service create egress`; an empty platform allowlist approves nothing.

Redis and NATS storage parameters do not allocate a PVC. PostgreSQL uses a
PVC. local-path does not enforce capacity or support expansion. Deletion of
Postgres blocks while any `ServiceBinding` still references it. Retain keeps
the PVC and credential Secrets; Delete removes them. Recreating a service name
does not reuse a retained volume. Recovery steps are in the backing-services
topic. Retention is not a backup.

## Repository checks

From the platform repository:

```sh
bun install
bun run build
bun test
bun run lint
bun run typecheck
```

`bun test` builds `@di-framework/platform`, `@di-framework/bindings`, and
`@di-framework/cloudfoundry` first. The SQLite provider is separate:

```sh
cd platform/sqlite-component
make tools
make build
make smoke
```

`make tools` installs the pinned wasm-tools, wac, and wasi-sdk. `make smoke`
needs `wasmtime` on `PATH`. Typecheck and unit tests do not provision a cluster.

## wasmCloud application workflow

Source: `createWasmcloudCommand` in [di-framework/cli-extensions](https://github.com/di-framework/cli-extensions). Versioned topics: [wasmCloud](https://docs.di-framework.dev/v6.0/wasmcloud.html) and [kube](https://docs.di-framework.dev/v6.0/kube.html). Installed extension `--help` takes precedence; flags and runner selection are in [toolchain.md](toolchain.md).

In 6.0 the extension package/group became `@di-framework/cli-plugin-platform` / `platform`. Through 5.x they were `@di-framework/cli-plugin-wasmcloud` / `wasmcloud`. Cluster lifecycle moved from `wasmcloud platform deploy` to `platform cluster up`. Project-local extensions take precedence over the user-global store; avoid silently upgrading a global installation.

Reuse the application's tested Fetch handler as the component entry and declared bindings. Run:

```sh
di-framework platform doctor
di-framework platform build
di-framework platform dev
```

Doctor checks toolchain readiness. Build emits the component; dev chooses a supported local runner (wasmtime, wash, or jco). Inspect the actual endpoint and send a representative request. Native tests do not establish WASI compatibility. If host calls fail, compare generated component imports with the target host's supported interfaces.

For requested deployment, reuse the intended target, namespace, registry, and credentials. Do not provision a platform merely because an application needs deploying. Once authorized, use the verified target:

```sh
di-framework platform deploy my-api --target development
```

Verify reported readiness and a representative request using the returned address/Host header. Report artifact, target, readiness, and observed response. On failure inspect tool output, registry access, and cluster resources before retrying; stop repeated unchanged failures.

`platform destroy` removes a workload; `platform cluster destroy` removes a managed local platform. `di-framework-kube down` and `--purge-cluster` are separate. Teardown belongs only to explicitly requested cleanup. Use [kube.md](kube.md) for an existing kube owner's configuration and claims.

The plugin suite verifies native authoring behavior; it does not build components, create infrastructure, or prove a host/toolchain combination. Perform those checks in the actual application environment when requested. For release configuration and shutdown design, consult [Twelve-Factor guidance](../../principled-engineering/references/twelve-factors.md).
