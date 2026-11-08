import type { Order } from '../domain/order.js';

export interface OrderRepository {
  create(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  confirm(id: string): Promise<'confirmed' | 'not_found' | 'already_confirmed'>;
  ping(): Promise<void>;
}
