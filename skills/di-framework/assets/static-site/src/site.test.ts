import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearRegisteredStaticAssets, packageStaticAssets } from '@di-framework/http';
import { createSite } from './site';

const PUBLIC_DIR = join(import.meta.dir, '..', 'public');
const get = (site: ReturnType<typeof createSite>, path: string, headers: HeadersInit = {}) =>
  site.fetch(new Request(`http://site${path}`, { headers }));

const scratch = mkdtempSync(join(tmpdir(), 'static-site-'));
afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  clearRegisteredStaticAssets();
});

for (const mode of ['live', 'packaged'] as const) {
  describe(`${mode} mode`, () => {
    const site =
      mode === 'live'
        ? createSite({ spa: true })
        : // Packaged: point at a directory that does not exist, as in a deployed guest.
          createSite({
            spa: true,
            directory: join(scratch, 'missing'),
            package: packageStaticAssets({ directory: PUBLIC_DIR }),
          });

    test('serves the root index and nested directory indexes', async () => {
      const home = await get(site, '/');
      expect(home.status).toBe(200);
      expect(home.headers.get('content-type')).toContain('text/html');
      expect(home.headers.get('cache-control')).toBe('no-cache');
      expect(await home.text()).toContain('Home');
      expect(await (await get(site, '/docs/')).text()).toContain('Docs');
    });

    test('caches fingerprinted assets and answers 304 on a matching ETag', async () => {
      const css = await get(site, '/assets/app.css');
      expect(css.status).toBe(200);
      expect(css.headers.get('cache-control')).toContain('immutable');
      const etag = css.headers.get('etag') ?? '';
      await css.text();
      expect((await get(site, '/assets/app.css', { 'if-none-match': etag })).status).toBe(304);
    });

    test('falls back to the shell for client routes, never for assets or API', async () => {
      const route = await get(site, '/settings/profile', { accept: 'text/html' });
      expect(route.status).toBe(200);
      expect(await route.text()).toContain('Home');
      expect((await get(site, '/assets/missing.js', { accept: 'text/html' })).status).toBe(404);
      expect((await get(site, '/missing.png', { accept: 'text/html' })).status).toBe(404);
      expect((await get(site, '/api/nope', { accept: 'text/html' })).status).toBe(404);
    });

    test('keeps API routes beside the site', async () => {
      expect(await (await get(site, '/api/health')).json()).toEqual({ ok: true });
    });

    test('blocks traversal and hidden files', async () => {
      expect([403, 404]).toContain((await get(site, '/assets/..%2f..%2fpackage.json')).status);
      expect((await get(site, '/.env')).status).toBe(404);
    });
  });
}
