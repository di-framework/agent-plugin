# Static asset serving behavior

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
