import { beforeEach, expect, test } from 'bun:test';
import { ApplicationContext } from '@di-framework/core/application-context';
import { Container as DIContainer } from '@di-framework/core/container';
import { OrderService } from './application/order-service';
import { OrdersConfiguration } from './composition';
import { PAYMENTS, type Payments } from './domain/order';
import { orderRoutes } from './http/order-routes';
import { InMemoryOrderStore } from './infrastructure/in-memory-order-store';

let charges: number;
let router: ReturnType<typeof orderRoutes>;

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  router.fetch(
    new Request(`http://test${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  );

beforeEach(async () => {
  charges = 0;
  // A fresh container per test: the real classes and beans, with a fake at the payments port.
  const container = new DIContainer();
  container.register(InMemoryOrderStore);
  container.register(OrderService);
  container.registerValue(PAYMENTS, {
    async charge(_customer: string, amount: number) {
      charges++;
      return amount < 1000;
    },
  } satisfies Payments);
  await ApplicationContext.builder(container).configuration(OrdersConfiguration).start();
  router = orderRoutes(container.resolve(OrderService));
});

test('places, replays by idempotency key, and pays once', async () => {
  const first = await post('/orders', { customerId: 'c1', total: 50 }, { 'idempotency-key': 'k1' });
  expect(first.status).toBe(201);
  const order = await first.json();
  const replay = await post('/orders', { customerId: 'c1', total: 50 }, { 'idempotency-key': 'k1' });
  expect((await replay.json()).id).toBe(order.id);

  expect((await (await post('/orders/pay', { id: order.id })).json()).status).toBe('paid');
  expect((await (await post('/orders/pay', { id: order.id })).json()).status).toBe('paid');
  expect(charges).toBe(1);
});

test('maps domain errors to statuses', async () => {
  expect((await post('/orders', { customerId: '', total: 5 })).status).toBe(400);
  expect((await post('/orders/pay', { id: 'missing' })).status).toBe(404);
  const big = await (await post('/orders', { customerId: 'c1', total: 5000 })).json();
  expect((await post('/orders/pay', { id: big.id })).status).toBe(402);
});
