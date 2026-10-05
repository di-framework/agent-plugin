import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createStaticAssetHandler,
  HttpRouter,
  json,
  type StaticAssetPackage,
} from '@di-framework/http';

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

export interface SiteOptions {
  /** Directory with the built site. Live from disk while it exists and no package is given. */
  directory?: string;
  /** Packaged bytes from scripts/package-assets.ts; required where the directory is absent. */
  package?: StaticAssetPackage;
  /** Serve index.html for unknown HTML navigations (client-side routing). */
  spa?: boolean;
}

/**
 * One router for the API and the site.
 * - /assets/* : fingerprinted build output, cached for a year (static mount, 404 on miss).
 * - /api/*    : application routes.
 * - /*        : root files and HTML, revalidated on every request (ETag → 304).
 * The static handler has no index-file routing or SPA fallback, so the last route adds both.
 */
export function createSite(options: SiteOptions = {}) {
  const directory = options.directory ?? PUBLIC_DIR;
  const files = createStaticAssetHandler('/', {
    directory,
    package: options.package,
    cacheControl: 'no-cache',
    fallthrough: true,
  });

  const router = HttpRouter.builder()
    .static('/assets', {
      // Live mode reads <directory>/assets; a package is re-keyed so /assets/app.js becomes /app.js.
      directory: join(directory, 'assets'),
      package: options.package && scope(options.package, '/assets'),
      cacheControl: 'public, max-age=31536000, immutable',
    })
    .build();

  router.get('/api/health', () => json({ ok: true }));
  router.all('/api/*', () => json({ error: 'not found' }, { status: 404 }));

  router.all('*', async (request: Request) => {
    const url = new URL(request.url);
    const file = await files(request);
    if (file) return file;
    // Directory index: "/" and "/docs/" → that directory's index.html.
    if (url.pathname.endsWith('/')) {
      const index = await files(rewrite(request, `${url.pathname}index.html`));
      if (index) return index;
    }
    // SPA fallback: only for browser navigations to extensionless paths.
    if (options.spa && accepts(request, 'text/html') && !/\.[a-z0-9]+$/i.test(url.pathname)) {
      const shell = await files(rewrite(request, '/index.html'));
      if (shell) return shell;
    }
    return new Response('Not Found', { status: 404 });
  });

  return router;
}

function rewrite(request: Request, pathname: string): Request {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, { method: request.method, headers: request.headers });
}

function accepts(request: Request, type: string): boolean {
  return (request.headers.get('accept') ?? '').includes(type);
}

/** Re-keys a package so a mount at `prefix` finds `/assets/app.js` as `/app.js`. */
function scope(pkg: StaticAssetPackage, prefix: string): StaticAssetPackage {
  const assets: StaticAssetPackage['assets'] = {};
  for (const [key, entry] of Object.entries(pkg.assets)) {
    if (key.startsWith(`${prefix}/`)) assets[key.slice(prefix.length)] = entry;
  }
  return { ...pkg, assets };
}
