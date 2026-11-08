import type { Pool } from 'pg';
import type { Order, OrderItem } from '../domain/order.js';
import type { OrderRepository } from '../application/order-repository.js';

interface OrderRow {
  id: string; status: Order['status']; total_cents: string;
  created_at: Date; confirmed_at: Date | null;
}

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly pool: Pool) {}

  async create(order: Order): Promise<Order> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO orders(id,status,total_cents,created_at) VALUES($1,$2,$3,$4)',
        [order.id, order.status, order.totalCents, order.createdAt]);
      for (const [position, item] of order.items.entries()) {
        await client.query('INSERT INTO order_items(order_id,position,sku,quantity,unit_price_cents) VALUES($1,$2,$3,$4,$5)',
          [order.id, position, item.sku, item.quantity, item.unitPriceCents]);
      }
      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async findById(id: string): Promise<Order | null> {
    const result = await this.pool.query<OrderRow>('SELECT id,status,total_cents,created_at,confirmed_at FROM orders WHERE id=$1', [id]);
    const row = result.rows[0];
    if (!row) return null;
    const totalCents = Number(row.total_cents);
    if (!Number.isSafeInteger(totalCents)) throw new Error('Total fora do intervalo inteiro seguro.');
    const items = await this.pool.query<OrderItem>(
      'SELECT sku,quantity,unit_price_cents AS "unitPriceCents" FROM order_items WHERE order_id=$1 ORDER BY position', [id]);
    return { id: row.id, status: row.status, totalCents, items: items.rows,
      createdAt: row.created_at.toISOString(), confirmedAt: row.confirmed_at?.toISOString() ?? null };
  }

  async confirm(id: string): Promise<'confirmed' | 'not_found' | 'already_confirmed'> {
    const changed = await this.pool.query(
      "UPDATE orders SET status='CONFIRMED', confirmed_at=clock_timestamp() WHERE id=$1 AND status='PENDING' RETURNING id", [id]);
    if (changed.rowCount === 1) return 'confirmed';
    const existing = await this.pool.query('SELECT id FROM orders WHERE id=$1', [id]);
    return existing.rowCount === 0 ? 'not_found' : 'already_confirmed';
  }

  async ping(): Promise<void> { await this.pool.query('SELECT 1'); }
}
