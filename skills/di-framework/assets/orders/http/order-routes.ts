import { json, TypedRouter } from '@di-framework/http';
import type { OrderService } from '../application/order-service';
import { OrderError } from '../domain/order';

/** HTTP adapter: request → command, domain error → status. The only place Responses are built. */
export function orderRoutes(orders: OrderService) {
  const router = TypedRouter({
    catch: (error: unknown) =>
      error instanceof OrderError
        ? json({ error: error.message }, { status: error.status })
        : json({ error: 'internal error' }, { status: 500 }),
  });

  router.post('/orders', async (request) => {
    const body = (await request.json()) as { customerId?: string; total?: number };
    const order = await orders.place({
      customerId: body.customerId ?? '',
      total: Number(body.total),
      idempotencyKey: request.headers.get('idempotency-key') ?? undefined,
    });
    return json(order, { status: 201 });
  });

  router.post('/orders/pay', async (request) => {
    const body = (await request.json()) as { id?: string };
    return json(await orders.pay(body.id ?? ''));
  });

  return router;
}
