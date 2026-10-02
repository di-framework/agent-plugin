/** Domain model, port, and errors. No framework imports. */
export interface Order {
  id: string;
  customerId: string;
  total: number;
  status: 'open' | 'paid';
}

/** Port token. The composition root binds it to an adapter; tests bind a fake. */
export const ORDER_STORE = 'orders.store';

export interface OrderStore {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<Order>;
  /** Idempotency record: returns the order id an earlier request with this key produced. */
  findByIdempotencyKey(key: string): Promise<string | null>;
  rememberIdempotencyKey(key: string, orderId: string): Promise<void>;
  /** Runs fn so that every write inside commits or fails together. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export const PAYMENTS = 'orders.payments';

export interface Payments {
  charge(customerId: string, amount: number): Promise<boolean>;
}

/** A rule violation the HTTP adapter maps to a status. */
export class OrderError extends Error {
  constructor(
    readonly status: 400 | 402 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}
