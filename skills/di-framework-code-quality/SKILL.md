---
name: di-framework-code-quality
description: Set up or fix linting, formatting, typechecking, and git hooks in a di-framework application with Biome, tsc, and plain git hooks. Use for biome.json, Biome failing to parse constructor decorators, lint/format/typecheck scripts, pre-commit or pre-push hooks, coverage gates, or tsconfig strictness.
---

# Code quality

The recommended toolchain matches the framework's own: Biome for lint and format, `tsc --noEmit` for types, and plain git hooks in a committed `.githooks/` directory. No ESLint, Prettier, husky, or lint-staged is needed.

Inspect the app first: an existing ESLint/Prettier setup, `biome.json`, `tsconfig.json`, `bunfig.toml`, `package.json` scripts, and `git config core.hooksPath`. If the app already has a working linter and formatter, keep it and apply only the decorator and tsconfig notes below. Do not run two formatters.

## Set up

1. `bun add -d @biomejs/biome`, copy [assets/biome.json](assets/biome.json) to the project root, and set `$schema` to the installed Biome version (`bun x biome --version`).
2. Copy [assets/githooks/](assets/githooks/) to `.githooks/` and keep the files executable (`chmod +x .githooks/*`).
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
4. Optional per-file coverage gate: copy [scripts/check-line-coverage.ts](scripts/check-line-coverage.ts) to `scripts/`. The pre-push hook runs it when present. It fails on any file under `src/` (or prefixes you pass) with an uncovered line, which an aggregate threshold misses.
5. Run `bun run lint:fix` once and commit that formatting separately from behavior changes.

## Biome and decorators

- `javascript.parser.unsafeParameterDecoratorsEnabled: true` is required. Without it Biome cannot parse `@Component(Token)` constructor parameters. A parse error on a decorated parameter is a config gap, not a code bug.
- The asset formats with 2 spaces, width 100, single quotes, semicolons, trailing commas, and organized imports. It extends the `recommended` rules and downgrades `noExplicitAny`, unused variables and parameters, `noNamespace`, and `noBannedTypes` to warnings. Warnings do not fail `biome check`; fix them in code you touch.
- Exclude generated code (`!src/generated`, codegen output) in `files.includes`. Never hand-format or hand-edit generated files to quiet the linter.
- After upgrading Biome, run `bun x biome migrate --write` and keep `$schema` in step.

## TypeScript

Required for di-framework: `experimentalDecorators: true`, `emitDecoratorMetadata: false`, and no `reflect-metadata` import. Recommended: `strict`, `skipLibCheck`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `types: ["bun"]`. Keep the `@di-framework/tsc` plugin entry that `di-framework init` adds (`di-framework-tsc`).

`di-framework check` typechecks through `ttsc` when installed; `bun x tsc --noEmit` is the fast check for hooks. If the app has several tsconfig projects (a client, scripts), chain them in `typecheck`. Do not relax `strict` or add `// @ts-ignore` to get past a hook.

## Hooks

- `pre-commit`: `bun typecheck`, then `biome check --staged --write`. Biome fixes files but does not re-stage them: review the diff, `git add`, commit again.
- `pre-push`: `bun test --coverage`. With `coverageThreshold` in `bunfig.toml`, a run reporting `0 fail` that still exits 1 means coverage fell below the threshold. Add tests for the listed lines rather than lowering it.

```toml
# bunfig.toml
[test]
coverageReporter = ["text", "lcov"]
coverageThreshold = { lines = 0.9, functions = 0 }
coveragePathIgnorePatterns = ["**/*.test.ts", "**/generated/**", "**/dist/**"]
```

Leave `functions = 0`: Bun under-counts decorated constructors, so function coverage misreports DI classes.

Do not bypass hooks with `--no-verify` unless the user asks. Report the failing command and output instead.

## Verify a change

From the project root: `bun run lint`, `bun run typecheck`, `bun test`, and `bun run check` or `bun run build` when the app emits through `@di-framework/tsc`. Mirror the same steps in CI (`di-framework-cicd`).
