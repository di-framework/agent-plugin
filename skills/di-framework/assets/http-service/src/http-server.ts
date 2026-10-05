import { Component, Container } from '@di-framework/core/decorators';
import { json, TypedRouter } from '@di-framework/http';
import { GreetingService } from './greeting-service';

/** Owns the router and the listening socket; ApplicationContext calls start/stop. */
@Container()
export class HttpServer {
  readonly router = TypedRouter();
  private server?: ReturnType<typeof Bun.serve>;

  constructor(@Component(GreetingService) private readonly greetings: GreetingService) {
    this.router.get('/health', () => json({ ok: true }));
    this.router.get('/hello', (request) => {
      const name = new URL(request.url).searchParams.get('name') ?? 'world';
      return json({ message: this.greetings.greet(name) });
    });
  }

  fetch(request: Request): Promise<Response> {
    return this.router.fetch(request);
  }

  start(): void {
    const port = Number(process.env.PORT ?? 3000);
    this.server = Bun.serve({ port, fetch: (request) => this.fetch(request) });
    console.log(`listening on http://localhost:${this.server.port}`);
  }

  async stop(): Promise<void> {
    await this.server?.stop();
  }
}
