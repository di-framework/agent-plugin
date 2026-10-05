import { Container } from '@di-framework/core/decorators';
import { InMemoryRepository } from '@di-framework/repo';
import type { Order, OrderStore } from '../domain/order';

/**
 * Adapter for development and tests. A production adapter (SQL, D1, Postgres binding)
 * implements the same OrderStore port and is bound in composition.ts instead.
 */
@Container()
export class InMemoryOrderStore implements OrderStore {
  private readonly orders = new InMemoryRepository<Order, string>();
  private readonly keys = new Map<string, string>();
  private queue: Promise<unknown> = Promise.resolve();

  findById(id: string) {
    return this.orders.findById(id);
  }

  save(order: Order) {
    return this.orders.save(order);
  }

  async findByIdempotencyKey(key: string) {
    return this.keys.get(key) ?? null;
  }

  async rememberIdempotencyKey(key: string, orderId: string) {
    this.keys.set(key, orderId);
  }

  /** Serializes callers; a SQL adapter would open a real transaction here. */
  transaction<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }
}
