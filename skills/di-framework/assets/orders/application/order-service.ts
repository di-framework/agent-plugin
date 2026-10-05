import { Component, Container } from '@di-framework/core/decorators';
import {
  ORDER_STORE,
  type Order,
  OrderError,
  type OrderStore,
  PAYMENTS,
  type Payments,
} from '../domain/order';

export interface PlaceOrder {
  customerId: string;
  total: number;
  idempotencyKey?: string;
}

/** Use cases. Knows ports, never adapters, Request, or Response. */
@Container()
export class OrderService {
  constructor(
    @Component(ORDER_STORE) private readonly orders: OrderStore,
    @Component(PAYMENTS) private readonly payments: Payments,
  ) {}

  place(command: PlaceOrder): Promise<Order> {
    if (!command.customerId || !(command.total > 0)) {
      throw new OrderError(400, 'customerId and a positive total are required');
    }
    return this.orders.transaction(async () => {
      if (command.idempotencyKey) {
        const earlier = await this.orders.findByIdempotencyKey(command.idempotencyKey);
        if (earlier) return this.get(earlier);
      }
      const order: Order = {
        id: crypto.randomUUID(),
        customerId: command.customerId,
        total: command.total,
        status: 'open',
      };
      await this.orders.save(order);
      if (command.idempotencyKey) {
        await this.orders.rememberIdempotencyKey(command.idempotencyKey, order.id);
      }
      return order;
    });
  }

  async pay(id: string): Promise<Order> {
    const order = await this.get(id);
    if (order.status === 'paid') return order;
    if (!(await this.payments.charge(order.customerId, order.total))) {
      throw new OrderError(402, 'payment declined');
    }
    return this.orders.save({ ...order, status: 'paid' });
  }

  async get(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) throw new OrderError(404, `order ${id} not found`);
    return order;
  }
}
