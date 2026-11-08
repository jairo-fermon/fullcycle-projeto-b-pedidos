import { randomUUID } from 'node:crypto';

export interface OrderItem { sku: string; quantity: number; unitPriceCents: number }
export interface Order {
  id: string; status: 'PENDING' | 'CONFIRMED'; items: OrderItem[];
  totalCents: number; createdAt: string; confirmedAt: string | null;
}

export class OrderError extends Error {
  constructor(public readonly code: 'INVALID_INPUT' | 'NOT_FOUND' | 'ALREADY_CONFIRMED', message: string) {
    super(message);
  }
}

export function createOrder(input: unknown): Order {
  if (!Array.isArray(input) || input.length < 1 || input.length > 100) {
    throw new OrderError('INVALID_INPUT', 'O pedido deve conter de 1 a 100 itens.');
  }
  const items = input.map((item: unknown): OrderItem => {
    if (!item || typeof item !== 'object') throw new OrderError('INVALID_INPUT', 'Item inválido.');
    const { sku, quantity, unitPriceCents } = item as Record<string, unknown>;
    if (typeof sku !== 'string' || sku.trim().length < 1 || sku.length > 64 || sku !== sku.trim()
      || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000
      || typeof unitPriceCents !== 'number' || !Number.isInteger(unitPriceCents)
      || unitPriceCents < 1 || unitPriceCents > 1000000) {
      throw new OrderError('INVALID_INPUT', 'SKU, quantidade ou preço fora dos limites permitidos.');
    }
    return { sku, quantity, unitPriceCents };
  });
  return {
    id: randomUUID(), status: 'PENDING', items,
    totalCents: items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0),
    createdAt: new Date().toISOString(), confirmedAt: null
  };
}

export function assertCanConfirm(order: Order): void {
  if (order.status !== 'PENDING') throw new OrderError('ALREADY_CONFIRMED', 'O pedido já foi confirmado.');
}
