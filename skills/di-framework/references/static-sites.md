# Static sites

`@di-framework/http` serves files from a directory during development and from packaged in-memory bytes after a build, through the same mount. Docs: <https://docs.di-framework.dev/http-router.html#static-assets>. Verified against **6.0.3**; check the installed `@di-framework/http` version and its `StaticAssetOptions` type before using an option.

Inspect first: the app's router (`TypedRouter` versus `HttpRouter.builder()`), where the frontend build writes its output, whether the deploy target has a filesystem, and existing middleware or auth.

## Start from the asset

[assets/static-site/](../assets/static-site/) is a tested starter. Copy it and replace `public/` with your build output.

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

Statuses, ETag rules, and option details follow under serving behavior below.

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

- **wasmCloud.** The platform build does not discover `.static()` directories, and the guest's portable `@di-framework/http` entry has no `node:fs` or `packageStaticAssets`. Run the package step before `di-framework platform build` and import the generated module from the component entry. Read [diagnostics.md](diagnostics.md) and [platform.md](platform.md).
- **Bundle size.** Packages embed bytes as UTF-8 or base64. Keep large media, video, and downloads in object storage or a CDN.
- **Not available:** compression, byte ranges, and remote or CDN storage. Put a CDN or reverse proxy in front when you need them.

## Verify

Run `bun test` (the starter covers both modes), then start the app and request `/`, a nested directory, a hashed asset (repeat with `If-None-Match` and expect 304), a client route with `Accept: text/html`, a missing asset (expect 404), and an API route. For a packaged deploy, run the same requests with the source directory absent.

## Serving behavior

From the [HTTP router static assets docs](https://docs.di-framework.dev/http-router.html#static-assets), checked against the published `@di-framework/http` 6.0.3 types and the starter's tests.

## Options

```ts
interface StaticAssetOptions {
  directory: string;                         // live root; also a registry lookup key
  fallthrough?: boolean;                     // default false
  cacheControl?: string;                     // set on 200 and 304
  manifest?: StaticAssetManifest | string;   // metadata; a string path works only on the native entry
  package?: StaticAssetPackage;              // in-memory bytes
  live?: boolean;                            // force disk (true) or package (false)
}
```

Mount with `HttpRouter.builder().static(prefix, options)`, on a built router's `.static(...)`, or `@HttpRouter({ static: [{ prefix, ...options }] })`. `TypedRouter()` has no `.static()`. `createStaticAssetHandler(prefix, options)` returns the bare handler (`Response | undefined`) for use inside your own route.

**Live versus packaged.** Live is the default when the directory exists and there are no packaged contents. Packaged contents win unless `live: true`. A packaged bundle is found from `package`, then `manifest`, then the registry under the mount prefix, the normalized prefix, or `directory` (what `registerStaticAssets(key, pkg)` and the generated module populate).

## Responses

| Case | Status |
| --- | --- |
| File found | 200 |
| `If-None-Match` matches | 304, empty body, `ETag` and `Cache-Control` kept |
| Missing, hidden (`.` segment), directory, mount root `/`, no source | 404 |
| `..` traversal or symlink escaping the root | 403 (bad `%` encoding → 400) |
| Method other than GET/HEAD | 405 with `Allow: GET, HEAD` |

With `fallthrough: true`, every row except 200 and 304 returns `undefined`, so later routes run instead.

- MIME types come from a built-in map; unknown extensions are `application/octet-stream`; text types get `charset=utf-8`.
- ETags: packaged files get a strong SHA-256 tag; live files get a weak `W/"size-mtime-ctime"` tag.
- Live GET streams from a file descriptor without `Content-Length`. Read or `cancel()` every body you do not return, or the descriptor stays open. Packaged responses and live HEAD include `Content-Length`.
- Hidden paths are never served and are left out of packages: `/.well-known/*` needs explicit routes.

## Route order

`build()` registers `.use()` middleware, then `.static()` mounts, then auth and `.extend()` extensions. Routes added to the built router come after that.

- Global middleware runs before static mounts, so it can guard or reject asset requests.
- `withAuthRoutes` does not wrap static mounts. Guard private assets with `.use(guard)`, or use `fallthrough: true` and serve them from a guarded route.
- A non-fallthrough mount answers 404/405 for everything under its prefix; later routes under that prefix never run.

## Packaging

`packageStaticAssets({ directory, outputDir?, outFile?, format?, prefix? })` runs on the build host (native entry only; it uses `node:fs`).

- Returns the package. `outputDir` writes `manifest.json` and `static-assets.json`. `outFile` writes JSON, or a JS/TS module that calls `registerStaticAssets(prefix ?? directory, pkg)` and default-exports the package.
- Keys are posix paths with a leading slash (`/assets/app.js`) relative to `directory`.
- Text is stored as UTF-8 and binary as base64 inside the module. Large media inflates the bundle; serve it from object storage or a CDN instead.
- A missing directory throws `Directory not found` at package time. A missing live directory at serve time is a 404 (or fallthrough).

## Not implemented

Index files, SPA fallback, compression, byte ranges, configurable exclusions, remote storage or CDN provisioning, frontend compilation, and automatic discovery of `.static()` directories by the CLI or platform build.
