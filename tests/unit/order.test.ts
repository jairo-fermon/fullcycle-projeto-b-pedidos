import { describe, expect, it } from 'vitest';
import { assertCanConfirm, createOrder, OrderError } from '../../src/domain/order.js';

const valid = { sku: 'SKU-1', quantity: 2, unitPriceCents: 1500 };
describe('Regras do pedido', () => {
  it('cria pedido pendente com UUID, data e centavos inteiros', () => {
    const order = createOrder([valid, { sku: 'SKU-2', quantity: 3, unitPriceCents: 101 }]);
    expect(order.totalCents).toBe(3303);
    expect(order.status).toBe('PENDING');
    expect(order.id).toMatch(/^[\da-f-]{36}$/);
    expect(Number.isNaN(Date.parse(order.createdAt))).toBe(false);
    expect(order.confirmedAt).toBeNull();
    expect(order.items[0]).not.toBe(valid);
  });
  it('aceita os limites máximos sem perda monetária', () => {
    const order = createOrder(Array.from({ length: 100 }, () => ({ sku: 'X'.repeat(64), quantity: 1000, unitPriceCents: 1000000 })));
    expect(order.totalCents).toBe(100000000000);
    expect(Number.isSafeInteger(order.totalCents)).toBe(true);
  });
  it.each([null, {}, [], Array(101).fill(valid), [null], ['texto'], [{}],
    [{ ...valid, sku: '' }], [{ ...valid, sku: ' X ' }], [{ ...valid, sku: 'X'.repeat(65) }],
    [{ ...valid, sku: 1 }], [{ ...valid, quantity: '2' }], [{ ...valid, quantity: 0 }],
    [{ ...valid, quantity: -1 }], [{ ...valid, quantity: 1.5 }], [{ ...valid, quantity: 1001 }],
    [{ ...valid, unitPriceCents: '1500' }], [{ ...valid, unitPriceCents: 0 }],
    [{ ...valid, unitPriceCents: -1 }], [{ ...valid, unitPriceCents: 1.5 }],
    [{ ...valid, unitPriceCents: 1000001 }], [{ ...valid, unitPriceCents: NaN }]
  ])('rejeita entrada inválida %#', input => {
    expect(() => createOrder(input)).toThrow(OrderError);
  });
  it('permite confirmação de pendente e rejeita confirmado', () => {
    const order = createOrder([valid]);
    expect(() => assertCanConfirm(order)).not.toThrow();
    expect(() => assertCanConfirm({ ...order, status: 'CONFIRMED', confirmedAt: new Date().toISOString() }))
      .toThrow('O pedido já foi confirmado.');
  });
});
