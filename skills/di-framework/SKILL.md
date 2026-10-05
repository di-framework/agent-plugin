---
name: di-framework
description: Build, change, test, diagnose, or deploy di-framework applications and their AI or platform integrations. Use for framework composition, transports, persistence, actors, generated contracts, toolchain, and architecture reviews; load only the resources needed for the task.
---

# di-framework

Use **inspect → design → implement → verify → deliver** for broad requests. A focused
request enters the relevant stage after checking the affected project's versions and
configuration. Read only the resources needed for that task. Deployment runs only when
it is part of the requested work; delivering a code change does not imply deploying it.
For reviews, assess the relevant design, testing, and release guidance and report
findings; edit code only when requested.

## Essential constraints

- Bundled application examples are verified against **6.0.3**, with legacy decorators
  (`experimentalDecorators: true`) and scoped `@di-framework/*` imports. No
  `reflect-metadata` is needed. A manifest range does not establish the installed version.
- Resolve the target's actual versions from installed metadata and its lockfile.
  The 6.0.x narrative snapshot is <https://docs.di-framework.dev/v6.0/>. For another
  release, check matching public declarations and tagged source and report unverified APIs.
- AI, platform, and CLI extensions have independent versions and peer constraints.
  The inspected AI 6.0.2 packages peer on core/auth **^5**; do not align them to core 6
  by package number. Read the relevant resource before changing those dependencies.
- Services declare constructor `@Component(Token)` dependencies. Bind tokens at the
  composition root; resolve there, in static handlers, or in tests. `@Bootstrap()` is
  deprecated; new startup uses `ApplicationContext`.

## Workflow

1. **Inspect.** Read existing structure, package scripts, installed versions, lockfile,
   decorator/compiler settings, and affected entrypoints. Use [discovery](references/discovery.md)
   for version-scoped docs and working examples. For a failure, enter
   [diagnostics](references/diagnostics.md) and preserve the failing command and behavior.
2. **Design.** Extend the existing app. Read [composition](references/composition.md)
   for wiring and lifecycle, or [architecture](references/architecture.md) for feature
   boundaries and consistency. Apply [principled-engineering](../principled-engineering/SKILL.md)
   when calibration, naming, or boundary decisions need it.
3. **Implement.** A new app starts with [bootstrap](references/bootstrap.md). For a
   focused change, choose the relevant resource below and preserve the project's commands
   and conventions. Keep generated files owned by the generator.
4. **Verify.** Use [testing](references/testing.md) for graph resolution and behavior;
   [toolchain](references/toolchain.md) for compiler/extension checks; and
   [quality and CI](references/quality-and-ci.md) for the project's gates. Use engineering
   test-double guidance where boundaries need substitution. Static MCP diagnostics and
   native tests alone do not prove transport readiness, WASI compatibility, or deployment.
5. **Deliver.** State the resulting behavior, checks run, and remaining verification
   limits. For requested deployment, follow [platform](references/platform.md) and
   [kube](references/kube.md) as applicable, preserve cluster ownership, and verify
   readiness plus a representative request. Use engineering release/configuration
   guidance when relevant.

## Resource routing

| Task | Read |
| --- | --- |
| HTTP routes, middleware, authentication, authorization, OpenAPI | [http](references/http.md) |
| Static mounts, SPAs, caching, packaged assets | [static sites](references/static-sites.md) |
| Semantic schema, portals, GraphQL execution | [graphql](references/graphql.md) |
| Schema manifests and generated transport contracts | [codegen](references/codegen.md) |
| RPC contracts, peers, memory or network transports | [rpc](references/rpc.md) |
| Repositories, adapters, SQLite migrations, PostgreSQL batches | [persistence](references/persistence.md) |
| Actor identity, mailboxes, storage, reload | [actors](references/actors.md) |
| Chat, tools, retrieval, SkillsAgent, AI utilities, ML | [ai](references/ai.md) |
| CLI, extensions, runtime type guards | [toolchain](references/toolchain.md) |
| wasmCloud, bindings, backing services, Pulumi | [platform](references/platform.md) |
| Kubesolo and existing cluster ownership | [kube](references/kube.md) |

Runnable examples are in `examples/`; complete starters and copyable templates are in
`assets/`; the coverage helper is in `scripts/`. Their relevant resources explain use
and verification. Explicit requests for a retired `di-framework-*` skill enter this
workflow at the matching resource instead of loading the old catalog.

## Completion

A code change is complete when the affected graph and behavior pass appropriate project
tests, required check/build/quality gates pass, and a running application request is
verified when the task requires it. A deployment additionally needs target readiness
and an observed response. Report unavailable checks as limits; do not infer their success
from compilation or partial static analysis.
