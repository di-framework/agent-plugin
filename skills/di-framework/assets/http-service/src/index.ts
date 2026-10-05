import { useContainer } from '@di-framework/core/container';
import { ApplicationContext } from '@di-framework/core/application-context';
import { HttpServer } from './http-server';

// Composition root: resolve the graph at startup so a missing registration fails before traffic.
const app = ApplicationContext.builder(useContainer()).bootstrap(HttpServer);
await app.start();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await app.stop();
    process.exit(0);
  });
}
