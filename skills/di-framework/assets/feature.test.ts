// Template: copy beside the feature under test and replace the sample classes with imports.
import { beforeEach, describe, expect, test } from 'bun:test';
import { Container as DIContainer } from '@di-framework/core/container';
import { Component, Container } from '@di-framework/core/decorators';
import { json, TypedRouter } from '@di-framework/http';
import { InMemoryRepository } from '@di-framework/repo';

// --- Sample feature (normally imported from ./order-service, ./order-routes, ...) ---
interface Order { id: string; total: number; status: 'open' | 'paid' }

const PAYMENTS = 'orders.payments';
interface Payments { charge(orderId: string, amount: number): Promise<boolean> }

class OrderRepository extends InMemoryRepository<Order, string> {}

@Container()
class OrderService {
  constructor(
    @Component(OrderRepository) private readonly orders: OrderRepository,
    @Component(PAYMENTS) private readonly payments: Payments,
  ) {}

  async pay(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) throw new Error(`order ${id} not found`);
    if (order.status === 'paid') return order;
    if (!(await this.payments.charge(id, order.total))) throw new Error('payment declined');
    return this.orders.save({ ...order, status: 'paid' });
  }
}

function orderRoutes(service: OrderService) {
  const router = TypedRouter({
    catch: (error: unknown) => json({ error: (error as Error).message }, { status: 402 }),
  });
  router.post('/orders/pay', async (request) => {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    return json(await service.pay(id));
  });
  return router;
}

// --- Tests ---
let container: DIContainer;
let charges: Array<[string, number]>;

beforeEach(async () => {
  // Fresh container per test: no state leaks through singletons or the global container.
  container = new DIContainer();
  charges = [];
  container.register(OrderRepository);
  container.registerValue(PAYMENTS, {
    async charge(orderId: string, amount: number) {
      charges.push([orderId, amount]);
      return amount < 1000;
    },
  } satisfies Payments);
  container.register(OrderService);
  const orders = container.resolve(OrderRepository);
  await orders.save({ id: 'o1', total: 50, status: 'open' });
  await orders.save({ id: 'o2', total: 5000, status: 'open' });
});

describe('OrderService', () => {
  test('charges once and marks the order paid', async () => {
    const service = container.resolve(OrderService);
    expect((await service.pay('o1')).status).toBe('paid');
    expect((await service.pay('o1')).status).toBe('paid');
    expect(charges).toEqual([['o1', 50]]);
  });

  test('rejects a declined payment and leaves the order open', async () => {
    await expect(container.resolve(OrderService).pay('o2')).rejects.toThrow('payment declined');
    expect((await container.resolve(OrderRepository).findById('o2'))?.status).toBe('open');
  });

  test('state does not leak between tests', async () => {
    expect(charges).toEqual([]);
    expect((await container.resolve(OrderRepository).findById('o1'))?.status).toBe('open');
  });
});

describe('order routes', () => {
  test('POST /orders/pay through router.fetch', async () => {
    const router = orderRoutes(container.resolve(OrderService));
    // POST bodies need a JSON content type; without it the router answers 415.
    const post = (id: string) =>
      new Request(`http://test/orders/pay?id=${id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
    const ok = await router.fetch(post('o1'));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ id: 'o1', status: 'paid' });

    const missing = await router.fetch(post('nope'));
    expect(missing.status).toBe(402);
  });
});
