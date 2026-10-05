import { beforeEach, expect, test } from 'bun:test';
import { Container as DIContainer } from '@di-framework/core/container';
import { GreetingService } from './greeting-service';
import { HttpServer } from './http-server';

let container: DIContainer;

beforeEach(() => {
  // A fresh container per test; register the real server and a test double for its collaborator.
  container = new DIContainer();
  container.registerValue(GreetingService, { greet: (name: string) => `Hi, ${name}` });
  container.register(HttpServer);
});

test('GET /hello uses the injected greeting service', async () => {
  const server = container.resolve(HttpServer);
  const response = await server.fetch(new Request('http://localhost/hello?name=Ada'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: 'Hi, Ada' });
});

test('GET /health responds without starting a socket', async () => {
  const response = await container.resolve(HttpServer).fetch(new Request('http://localhost/health'));
  expect(await response.json()).toEqual({ ok: true });
});
