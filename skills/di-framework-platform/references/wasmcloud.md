# wasmCloud application workflow

Command names below match `createWasmcloudCommand` in the cli-extensions checkout.
The versioned topics are <https://docs.di-framework.dev/v6.0/wasmcloud.html> and
<https://docs.di-framework.dev/v6.0/kube.html>. Use the installed extension's `--help`
when it disagrees with this note. Cluster install, bindings, and backing services are
the `di-framework-platform` skill. Kubesolo lifecycle is the `di-framework-kube` skill. Extension flags
are the `di-framework-cli-extensions` skill.

In 6.0 the extension publishes from
[di-framework/cli-extensions](https://github.com/di-framework/cli-extensions) as
`@di-framework/cli-plugin-platform`. The command group is `platform`. Through 5.x the
package was `@di-framework/cli-plugin-wasmcloud` and the group was `wasmcloud`.
Cluster lifecycle moved from `wasmcloud platform deploy` to `platform cluster up`.

```sh
di-framework extensions install platform
```

The extension can also be installed as a project dependency; project-local extensions take
precedence over the user-global store. Avoid silently upgrading a global installation.

An HTTP component project needs `di-framework.config.json`, for example:

```json
{ "name": "my-api", "entry": "src/app.ts", "output": "dist/my-api.wasm" }
```

Its entry exports the application's Fetch handler. Reuse its tested router. Named host
bindings, when used, live in `src/bindings.ts` and use `@di-framework/bindings`. Then:

```sh
di-framework platform doctor
di-framework platform build
di-framework platform dev
```

Doctor checks project/toolchain readiness. Build generates the component and disposable
`.di-framework` state. Dev builds then chooses a supported local runner (wasmtime,
wash, or jco); inspect its actual endpoint and send a representative HTTP request.
Native local tests do not establish WASI compatibility. Check the generated component's
imports and the target host's supported interfaces when host calls fail.

Deployment uses `di-framework.deploy.toml` targets at the workspace root. Reuse the
user's intended target, namespace, registry and credentials. The selected target may
reference a managed platform or an existing cluster; do not provision a platform merely
because an application needs deploying. Configuration values may interpolate environment
variables; do not copy secrets into generated source/configuration.

Once deployment is within the user's authorized task, use the verified target:

```sh
di-framework platform deploy my-api --target development
```

This builds, publishes the artifact and applies resources. Verify reported readiness and
perform an HTTP smoke test using the returned address/Host header. Report artifact,
target, readiness and observed response. On failure inspect tool exit output, registry
access and cluster resources before retrying; stop repeated unchanged failures.
`platform destroy` removes the application workload. It does not tear down a cluster.

## Cluster ownership

Choose the entrypoint that already owns the cluster. `di-framework platform cluster`
provisions a generated local platform. `di-framework-kube up` provisions Kubesolo.
Do not create a second stack for the same cluster, and do not add
`@di-framework/platform` to an application merely to deploy it. For a kube cluster,
point an external target at that instance's kubeconfig and registry.

`platform destroy` removes one application workload. `platform cluster destroy`
removes a managed local platform. `di-framework-kube down` and `--purge-cluster`
are separate. Teardown belongs only to an explicitly requested cleanup.

Backing services use `di-framework platform service` on the installed platform
extension. Read the `di-framework-platform` and `di-framework-kube` skills before changing tenancy,
admission, or cluster state.

The plugin's example suite verifies native authoring behavior. It does **not** run a
component build, create infrastructure, or prove a host/toolchain combination works;
perform those checks in the actual application environment when that is the task.
