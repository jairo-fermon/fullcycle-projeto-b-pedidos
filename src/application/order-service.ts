import { assertCanConfirm, createOrder, OrderError } from '../domain/order.js';
import type { Order } from '../domain/order.js';
import type { OrderRepository } from './order-repository.js';

export class OrderService {
  constructor(private readonly repository: OrderRepository) {}

  async create(items: unknown): Promise<Order> {
    return this.repository.create(createOrder(items));
  }

  async get(id: string): Promise<Order> {
    const order = await this.repository.findById(id);
    if (!order) throw new OrderError('NOT_FOUND', 'Pedido não encontrado.');
    return order;
  }

  async confirm(id: string): Promise<Order> {
    assertCanConfirm(await this.get(id));
    const result = await this.repository.confirm(id);
    // A verificação no banco também protege contra duas requisições simultâneas.
    if (result === 'not_found') throw new OrderError('NOT_FOUND', 'Pedido não encontrado.');
    if (result === 'already_confirmed') throw new OrderError('ALREADY_CONFIRMED', 'O pedido já foi confirmado.');
    return this.get(id);
  }
}
