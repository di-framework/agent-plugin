import { Bean, Configuration } from '@di-framework/core/decorators';
import { ORDER_STORE, type OrderStore } from './domain/order';
import { InMemoryOrderStore } from './infrastructure/in-memory-order-store';

/**
 * Binds the feature's ports declaratively. Swap an adapter by changing one bean.
 * PAYMENTS is bound by the application's own configuration (a real gateway in production,
 * a fake in tests).
 */
@Configuration()
export class OrdersConfiguration {
  @Bean(ORDER_STORE, { dependencies: [InMemoryOrderStore] })
  orderStore(store: InMemoryOrderStore): OrderStore {
    return store;
  }
}
