---
name: di-framework-static-sites
description: Serve a static site, single-page app, or asset directory from a di-framework app with @di-framework/http static mounts, including index pages, SPA fallback, cache headers, ETags, API routes beside the site, and packaging assets for deploys without the source directory (wasmCloud). Use for HttpRouter .static(), packageStaticAssets, registerStaticAssets, public/ folders, frontend build output, or 404s on asset paths.
---

# Static sites

`@di-framework/http` serves files from a directory during development and from packaged in-memory bytes after a build, through the same mount. Docs: <https://docs.di-framework.dev/http-router.html#static-assets>. Verified against **6.0.3**; check the installed `@di-framework/http` version and its `StaticAssetOptions` type before using an option.

Inspect first: the app's router (`TypedRouter` versus `HttpRouter.builder()`), where the frontend build writes its output, whether the deploy target has a filesystem, and existing middleware or auth.

## Start from the asset

[assets/static-site/](assets/static-site/) is a tested starter. Copy it and replace `public/` with your build output.

| File | Shows |
| --- | --- |
| `src/site.ts` | `createSite({ directory?, package?, spa? })`: `/assets` mount with immutable caching, `/api/*` routes, a catch-all that serves root files, directory `index.html`, and SPA fallback |
| `src/server.ts` | Bun entry (`export default { port, fetch }`); comment shows the packaged variant |
| `scripts/package-assets.ts` | `packageStaticAssets` → `src/generated/static-assets.ts` |
| `src/site.test.ts` | Same assertions in live and packaged mode (source directory absent) |

`bun run dev` serves `public/` live with hot reload; edits appear without a rebuild.

## Rules

- **Use `HttpRouter.builder().static(prefix, options)`.** `TypedRouter()` has no `.static()`. For a bare handler inside your own route, `createStaticAssetHandler(prefix, options)` returns `Response | undefined`.
- **No index files or SPA fallback are built in.** `GET /` and `GET /docs/` return 404 from a mount. Add a last catch-all that rewrites `…/` to `…/index.html` and, for SPAs, sends extensionless `Accept: text/html` navigations to `/index.html`. Never fall back for `/assets/*`, `/api/*`, or paths with a file extension, or a missing script returns HTML with status 200.
- **Order matters.** `build()` registers `.use()` middleware, then static mounts, then extensions; routes added to the built router come last. A mount with the default `fallthrough: false` answers 404/405 for everything under its prefix. Use `fallthrough: true` (or a narrow prefix like `/assets`) when routes share the space.
- **Caching.** `cacheControl` applies per mount. Fingerprinted build output (`/assets`, hashed names) gets `public, max-age=31536000, immutable`. HTML and unhashed root files get `no-cache` so browsers revalidate with the ETag and receive a 304.
- **Auth.** Global `.use()` middleware runs before static mounts. `withAuthRoutes` does not cover them. Protect private files with a `.use(guard)` or serve them from a guarded route; never put secrets in `public/`.
- **Hidden paths are not served.** Any segment starting with `.` is a 404 and is excluded from packages, so `/.well-known/…` needs an explicit route.
- **Bodies.** Live GET streams from a file descriptor. When a handler inspects a response and discards it, read or `cancel()` its body.

Statuses, ETag rules, and option details are in [references/serving-behavior.md](references/serving-behavior.md).

## Frontend build output

The framework does not compile frontends. Build with the frontend's tool (Vite, Astro, plain files) into the directory the mount serves, for example `vite build --outDir public` with assets under `public/assets`. Keep base paths consistent with the mount prefix (`base: '/'` for a root site, `/app/` for a mount at `/app`). Add `src/generated/` and the build output to `.gitignore` unless the repo commits them deliberately.

## Deploying without the source directory

Package on the build host after the frontend build:

```bash
bun run package:assets   # bun scripts/package-assets.ts public src/generated/static-assets.ts
```

Then pass the package in the production entry:

```ts
import staticAssetPackage from './generated/static-assets';
const site = createSite({ spa: true, package: staticAssetPackage });
```

The generated module also calls `registerStaticAssets(prefix ?? directory, pkg)`, so a mount whose prefix or `directory` matches that key finds it without `package:`. Packaged contents win over a live directory unless `live: true`.

- **wasmCloud.** The platform build does not discover `.static()` directories, and the guest's portable `@di-framework/http` entry has no `node:fs` or `packageStaticAssets`. Run the package step before `di-framework platform build` and import the generated module from the component entry. Read `di-framework-app-lifecycle` and `di-framework-platform`.
- **Bundle size.** Packages embed bytes as UTF-8 or base64. Keep large media, video, and downloads in object storage or a CDN.
- **Not available:** compression, byte ranges, and remote or CDN storage. Put a CDN or reverse proxy in front when you need them.

## Verify

Run `bun test` (the starter covers both modes), then start the app and request `/`, a nested directory, a hashed asset (repeat with `If-None-Match` and expect 304), a client route with `Accept: text/html`, a missing asset (expect 404), and an API route. For a packaged deploy, run the same requests with the source directory absent.
