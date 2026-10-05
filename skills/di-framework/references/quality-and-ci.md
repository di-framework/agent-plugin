# Code quality

The recommended toolchain matches the framework's own: Biome for lint and format, `tsc --noEmit` for types, and plain git hooks in a committed `.githooks/` directory. No ESLint, Prettier, husky, or lint-staged is needed.

Inspect the app first: an existing ESLint/Prettier setup, `biome.json`, `tsconfig.json`, `bunfig.toml`, `package.json` scripts, and `git config core.hooksPath`. If the app already has a working linter and formatter, keep it and apply only the decorator and tsconfig notes below. Do not run two formatters.

## Set up

1. `bun add -d @biomejs/biome`, copy [assets/biome.json](../assets/biome.json) to the project root, and set `$schema` to the installed Biome version (`bun x biome --version`).
2. Copy [assets/githooks/](../assets/githooks/) to `.githooks/` and keep the files executable (`chmod +x .githooks/*`).
3. Add scripts:

   ```json
   {
     "prepare": "git config core.hooksPath .githooks",
     "lint": "biome check .",
     "lint:fix": "biome check --write .",
     "format": "biome format --write .",
     "typecheck": "bun x tsc --noEmit",
     "test": "bun test"
   }
   ```

   `prepare` runs on `bun install`, so every clone gets the hooks. If the repo is not the git root (a monorepo package), point `core.hooksPath` at the right relative path or install hooks from the root instead.
4. Optional per-file coverage gate: copy [scripts/check-line-coverage.ts](../scripts/check-line-coverage.ts) to `scripts/`. The pre-push hook runs it when present. It fails on any file under `src/` (or prefixes you pass) with an uncovered line, which an aggregate threshold misses.
5. Run `bun run lint:fix` once and commit that formatting separately from behavior changes.

## Biome and decorators

- `javascript.parser.unsafeParameterDecoratorsEnabled: true` is required. Without it Biome cannot parse `@Component(Token)` constructor parameters. A parse error on a decorated parameter is a config gap, not a code bug.
- The asset formats with 2 spaces, width 100, single quotes, semicolons, trailing commas, and organized imports. It extends the `recommended` rules and downgrades `noExplicitAny`, unused variables and parameters, `noNamespace`, and `noBannedTypes` to warnings. Warnings do not fail `biome check`; fix them in code you touch.
- Exclude generated code (`!src/generated`, codegen output) in `files.includes`. Never hand-format or hand-edit generated files to quiet the linter.
- After upgrading Biome, run `bun x biome migrate --write` and keep `$schema` in step.

## TypeScript

Required for di-framework: `experimentalDecorators: true`, `emitDecoratorMetadata: false`, and no `reflect-metadata` import. Recommended: `strict`, `skipLibCheck`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `types: ["bun"]`. Keep the `@di-framework/tsc` plugin entry that `di-framework init` adds ([toolchain.md](toolchain.md)).

`di-framework check` typechecks through `ttsc` when installed; `bun x tsc --noEmit` is the fast check for hooks. If the app has several tsconfig projects (a client, scripts), chain them in `typecheck`. Do not relax `strict` or add `// @ts-ignore` to get past a hook.

## Hooks

- `pre-commit`: `bun typecheck`, then `biome check --staged --write`. Biome fixes files but does not re-stage them: review the diff, `git add`, commit again.
- `pre-push`: `bun test --coverage`. With `coverageThreshold` in `bunfig.toml`, a run reporting `0 fail` that still exits 1 means coverage fell below the threshold. Add tests for the listed lines rather than lowering it.

```toml
## bunfig.toml
[test]
coverageReporter = ["text", "lcov"]
coverageThreshold = { lines = 0.9, functions = 0 }
coveragePathIgnorePatterns = ["**/*.test.ts", "**/generated/**", "**/dist/**"]
```

Leave `functions = 0`: Bun under-counts decorated constructors, so function coverage misreports DI classes.

Do not bypass hooks with `--no-verify` unless the user asks. Report the failing command and output instead.

## Verify a change

From the project root: `bun run lint`, `bun run typecheck`, `bun test`, and `bun run check` or `bun run build` when the app emits through `@di-framework/tsc`. Mirror the same steps in CI as described below.

## CI/CD for a di-framework app

Inspect the app's `.github/workflows/`, `package.json` scripts, `bun.lock`, and `tsconfig.json` before editing. If the project uses another CI system, translate the same steps rather than adding GitHub Actions beside it. Local gates are described above; tests are in [testing.md](testing.md).

## Add CI

| Asset | Copy to |
| --- | --- |
| [assets/ci.yml](../assets/ci.yml) | `.github/workflows/ci.yml` |
| [assets/dependabot.yml](../assets/dependabot.yml) | `.github/dependabot.yml` |
| [assets/dependabot-auto-merge.yml](../assets/dependabot-auto-merge.yml) | `.github/workflows/` (optional) |

`ci.yml` runs `bun install --frozen-lockfile`, `typecheck`, `lint`, `bun test --coverage`, and `build`. It expects those scripts to exist (`di-framework init` creates `build` and `check`; add `typecheck`, `lint`, `test` per the local setup above). Remove a step only if the app truly lacks that gate, and say so.

- **Bun version.** Set `bun-version` to the version developers use locally. Do not leave `latest` in an app: a new Bun can change decorator or test behavior under an unchanged lockfile.
- **Lockfile.** Commit `bun.lock`. Keep `--frozen-lockfile`; a drift failure means the lockfile is stale, not that CI should do a plain install.
- **Decorators.** Run every command from the project root. Bun reads `experimentalDecorators` from the tsconfig in the working directory, so a step with a different `working-directory` can fail injection that passes locally.
- **`@di-framework/tsc`.** The first `di-framework build` compiles a Go sidecar. Enable the commented `actions/setup-go` step (pinned to a SHA) when `build` uses the transform; without Go that build fails.
- **Actions.** Pin third-party actions to full commit SHAs with a version comment; Dependabot's `github-actions` group bumps them. Never invent a SHA; copy it from the action's release.
- **Permissions.** Keep `contents: read` at the top and grant write scopes per job.
- **Services.** Integration tests that need Postgres or Redis use job `services:` and pass the URL through env, read via `@di-framework/config`.

## Dependency updates

Dependabot groups minor and patch `@di-framework/*` updates together, which keeps the application baseline aligned. Preserve AI/platform/extension peer distinctions (see [ai.md](ai.md) and [platform.md](platform.md)); split dependency groups when necessary. Mixed core copies load two containers. Treat the `bun-major` group as a migration: read the release notes and migration guide, update code, and run the full suite. The auto-merge workflow merges only non-major updates, and only after required checks pass. Enable "Allow auto-merge" and make `Test` a required check first.

## Deploying

Deploy from a separate job with `needs: test`, on `main` or a tag, inside a GitHub `environment` that holds its secrets. Build once and deploy that artifact.

- wasmCloud via the platform extension: install the extension version pinned in the project and run the deploy command its `--help` documents. Read [diagnostics.md](diagnostics.md) and [platform.md](platform.md); do not infer a working deployment from a passing TypeScript build.
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
