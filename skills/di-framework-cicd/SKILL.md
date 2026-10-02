---
name: di-framework-cicd
description: Set up or debug GitHub Actions CI, dependency updates, and deployment gates for a di-framework application. Use for adding ci.yml, Dependabot, auto-merge, pinning Bun and actions, CI-only failures (lockfile, decorators, Go sidecar, coverage), or wiring a deploy job after tests.
---

# CI/CD for a di-framework app

Inspect the app's `.github/workflows/`, `package.json` scripts, `bun.lock`, and `tsconfig.json` before editing. If the project uses another CI system, translate the same steps rather than adding GitHub Actions beside it. Local gates are `di-framework-code-quality`; tests are `di-framework-testing`.

## Add CI

| Asset | Copy to |
| --- | --- |
| [assets/ci.yml](assets/ci.yml) | `.github/workflows/ci.yml` |
| [assets/dependabot.yml](assets/dependabot.yml) | `.github/dependabot.yml` |
| [assets/dependabot-auto-merge.yml](assets/dependabot-auto-merge.yml) | `.github/workflows/` (optional) |

`ci.yml` runs `bun install --frozen-lockfile`, `typecheck`, `lint`, `bun test --coverage`, and `build`. It expects those scripts to exist (`di-framework init` creates `build` and `check`; add `typecheck`, `lint`, `test` per `di-framework-code-quality`). Remove a step only if the app truly lacks that gate, and say so.

- **Bun version.** Set `bun-version` to the version developers use locally. Do not leave `latest` in an app: a new Bun can change decorator or test behavior under an unchanged lockfile.
- **Lockfile.** Commit `bun.lock`. Keep `--frozen-lockfile`; a drift failure means the lockfile is stale, not that CI should do a plain install.
- **Decorators.** Run every command from the project root. Bun reads `experimentalDecorators` from the tsconfig in the working directory, so a step with a different `working-directory` can fail injection that passes locally.
- **`@di-framework/tsc`.** The first `di-framework build` compiles a Go sidecar. Enable the commented `actions/setup-go` step (pinned to a SHA) when `build` uses the transform; without Go that build fails.
- **Actions.** Pin third-party actions to full commit SHAs with a version comment; Dependabot's `github-actions` group bumps them. Never invent a SHA; copy it from the action's release.
- **Permissions.** Keep `contents: read` at the top and grant write scopes per job.
- **Services.** Integration tests that need Postgres or Redis use job `services:` and pass the URL through env, read via `@di-framework/config`.

## Dependency updates

Dependabot groups minor and patch `@di-framework/*` updates together, which keeps every framework package on one release. Mixed releases load two cores. Treat the `bun-major` group as a migration: read the release notes and migration guide, update code, and run the full suite. The auto-merge workflow merges only non-major updates, and only after required checks pass. Enable "Allow auto-merge" and make `Test` a required check first.

## Deploying

Deploy from a separate job with `needs: test`, on `main` or a tag, inside a GitHub `environment` that holds its secrets. Build once and deploy that artifact.

- wasmCloud via the platform extension: install the extension version pinned in the project and run the deploy command its `--help` documents. Read `di-framework-app-lifecycle` and `di-framework-platform`; do not infer a working deployment from a passing TypeScript build.
- Workers, containers, or a VM: use the target's own action or CLI after `bun run build`. See `examples/framework/cf-worker` for a Worker entry.
- Publishing a reusable package from the app repo: tag-triggered job, `id-token: write`, `npm publish --provenance --access public` with npm trusted publishing configured on npmjs.com (no long-lived `NPM_TOKEN`).

## Debugging a failed run

`gh run list`, then `gh run view <id> --log-failed`. Reproduce with the same Bun version from the project root.

| Symptom | Likely cause |
| --- | --- |
| `lockfile had changes, but lockfile is frozen` | `bun.lock` not committed or stale |
| Injection fails only in CI | Step runs outside the project root, or tsconfig lacks `experimentalDecorators` |
| `build` fails before compiling | Go missing for the `@di-framework/tsc` sidecar |
| Tests `0 fail` but the step exits 1 | `coverageThreshold` in `bunfig.toml` |
| Two `@di-framework/core` versions in `bun pm ls` | Partial upgrade; align all `@di-framework/*` versions |

Fix the cause. Do not disable a gate, loosen branch protection, or switch to a non-frozen install to get green.
