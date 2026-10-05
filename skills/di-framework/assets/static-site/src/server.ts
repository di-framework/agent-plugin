import { createSite } from './site';

// Development: serves public/ live from disk. For a deploy without public/, run
// `bun run package:assets` and pass the generated package:
//   import staticAssetPackage from './generated/static-assets';
//   const site = createSite({ spa: true, package: staticAssetPackage });
const site = createSite({ spa: true });

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: (request: Request) => site.fetch(request),
};
