/**
 * Build-host step: embed public/ into a module so the server (or a wasmCloud guest) can serve
 * the site without the directory. Run after the frontend build, before bundling the server.
 *
 *   bun scripts/package-assets.ts [publicDir] [outFile]
 */
import { packageStaticAssets } from '@di-framework/http';

const [directory = 'public', outFile = 'src/generated/static-assets.ts'] = process.argv.slice(2);
const pkg = packageStaticAssets({ directory, outFile, format: 'ts' });
console.log(`packaged ${Object.keys(pkg.assets).length} files from ${directory} into ${outFile}`);
