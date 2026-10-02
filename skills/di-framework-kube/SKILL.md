---
name: di-framework-kube
description: Create, inspect, upgrade, or tear down a di-framework-kube Kubesolo cluster and the shared Pulumi platform it installs. Use when running di-framework-kube or editing the kube repository.
---

# di-framework-kube

`di-framework-kube` creates an isolated Kubesolo cluster and installs
`@di-framework/platform/existing` through Pulumi. Kubesolo creation and deletion
stay in this CLI. Operator, tenancy, admission, routing, and backing services
come from the platform package. Read the `di-framework-platform` skill before changing
that package, and the `di-framework-cli-extensions` skill before deploying an application
onto the cluster.

Confirm flags with `di-framework-kube --help` and `di-framework-kube <command> --help`
on the binary you will run. The sibling checkout pins Kubesolo `v1.2.0`, the
wasmCloud runtime-operator chart `2.8.0`, and
`DefaultPlatformPackage` = `@di-framework/platform@6.0.2` in
`internal/platform/pulumi.go`. A published binary may pin a different platform
version. Use an exact npm version; ranges are rejected.

Commands are `up`, `down`, `status`, `outputs`, `kubeconfig`, and `version`.
Persistent `--state-dir` selects where instance state and kubeconfigs live.
The default instance name is `local`.

## Provision

Node.js, npm, and the Pulumi CLI are required. Container mode also needs a
running Docker Engine and supports macOS and Linux on amd64 and arm64. The CLI
downloads pinned `kubesoloctl`, verifies its SHA-256, and caches it. Helm is
bundled for status and legacy cleanup. Air-gapped image pulls are not
implemented.

```sh
di-framework-kube up
di-framework-kube status
di-framework-kube outputs
```

`up` and `down` never write `~/.kube/config`. Every instance names its admin
user `kubernetes-admin`. Use `di-framework-kube kubeconfig --name <instance>`.
Container-mode workload HTTP defaults to `127.0.0.1:28080` and reaches only the
default wasmCloud host group through NodePort `30080`. A tenant workload is
reached by port-forwarding that tenant's `di-http` Service in
`di-runtime-<tenant>`, not through the shared loopback port.

`--platform-config /absolute/path/platform.json` replaces tenant and user
declarations. Omitting it on an update preserves them. Explicit empty arrays
clear declarations. The file may also set `tenantHostImage`,
`tenantHostImagePullPolicy`, `storageRoot`, and `networkPolicyEngine`
(`existing` or `kube-router`). Managed Kubesolo defaults to policy-only
kube-router. `--values` merges administrator Helm values after the built-in
profile and cannot re-enable shared hosts or change watched-namespace
protections.

`--allow-insecure-registries` changes every wasmCloud host registry connection.
Use it only for a trusted local registry.

An existing cluster is selected explicitly:

```sh
di-framework-kube up --name edge --kubeconfig /secure/path/admin.kubeconfig --context edge-admin
```

Native Linux service mode is `sudo di-framework-kube up --name edge --run-mode service`.
It conflicts with an active host container runtime. Read the upstream Kubesolo
guide before using it.

## State and teardown

Each instance stores its Pulumi project at `<state-dir>/<name>/platform`, stack
`dev`, local file backend, and a mode-0600 `.passphrase` file. Back up the
instance directory and kubeconfig. Do not print or commit the passphrase.
A cluster ownership claim rejects a competing installation and is released only
after a successful `down`. Retry a failed `up` on the same instance. Do not
delete state to bypass the claim, and do not run `pulumi` against that project
while a kube command is running.

`down` removes the platform and keeps a managed Kubesolo cluster.
`down --purge-cluster` destroys the platform and then the cluster data. It is
refused when the instance was created with `--kubeconfig`.

An existing Helm-only install is left intact. `up` does not adopt it. `status`
and `down` still work. Removing it is a separate, explicit migration: back up
workload data, arrange downtime, run `down`, then `up`.

## Develop

Go 1.26 or newer. From the kube repository: `make test` and `make build`.
The binary is `./bin/di-framework-kube`.

To try an unpublished platform build, pack that package and pass the tarball.
`up` copies it to `vendor/platform-<sha256>.tgz` inside the instance project and
depends on the copy:

```sh
di-framework-kube up --name shared-test --http-port 28089 \
  --platform-package file:/tmp/di-framework-platform-6.0.2.tgz
```

`examples-apps` links sibling `di-framework`, `cli-extensions`, and `platform`
checkouts. Build those first, then follow `examples-apps/README.md`. Deploying
the examples creates a cluster; do it only when that is the requested task.
