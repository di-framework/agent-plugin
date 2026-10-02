---
name: di-framework-tsc
description: Set up @di-framework/tsc runtime parameter checks and di-framework project TypeScript wiring. Use for ttsc, tsconfig plugins, di-framework init, or when a build should inject runtime type guards.
---

# Project setup and runtime checks

`@di-framework/tsc` is a [ttsc](https://ttsc.dev) transform. It prepends runtime checks synthesized from parameter types. Source stays plain TypeScript: no schema library and no per-parameter assert helper. Guide: <https://docs.di-framework.dev/tsc.html>. The sibling checkout publishes **6.0.3**. CLI scaffolding is the `di-framework-cli` skill.

`di-framework init` already adds `@di-framework/tsc`, `plugins` in `tsconfig.json`, and `build` / `check` scripts that call `di-framework`. Use the steps below for an existing app.

## Wire an existing app

```bash
npm i -D @di-framework/tsc
```

The package depends on `ttsc` and TypeScript 7+. The first build compiles a Go sidecar (then cached). Needs `go` (1.26+ recommended). `ttsc` can pin the binary with `TTSC_GO_BINARY`.

```json
{
  "compilerOptions": {
    "strict": true,
    "plugins": [{ "transform": "@di-framework/tsc" }]
  }
}
```

The package also sets `ttsc.plugin` for auto-discovery when it is a devDependency. Keep the explicit `plugins` entry. Emit with `ttsc`, not stock `tsc`:

```bash
npx ttsc --emit
```

`di-framework build` runs that emit when `ttsc` resolves. `bun run dev` executes source on Bun and skips emit-time checks. A green Bun dev session does not prove the runtime guards exist.

In the di-framework monorepo, `@di-framework/tsc` is outside the TypeScript 5.x `tsc` project graph. Its package `build` is a no-op. Do not add `ttsc` or TypeScript 7 to other `@di-framework/*` packages to satisfy this plugin.

## What the transform checks

It walks functions, arrows (including concise and async), methods, and constructors. Required parameters get `typeof`, equality, or shape guards. Optional and defaulted parameters are checked only when the value is not `undefined`. Arrays use `Array.isArray` plus an element scan. Tuples check length. Class parameters use `instanceof` when the constructor is a local value. Interfaces stay structural.

Unsupported types are skipped entirely. Do not claim a guard exists for: nested defaults or rest inside destructuring, variadic tuples, imported class bindings, callable intersections, typia-style tags, conditional or mapped types, unions with an unsupported member or more than 12 members, `void`, `never`, or `unique symbol`. Enums with a computed member are skipped. Brand markers are not read at runtime. Structural walks stop at depth eight.

When a parameter is skipped, validation belongs in the function body or a schema at the boundary. Read `di-framework-codegen` if that boundary is a generated HTTP or RPC operation.
