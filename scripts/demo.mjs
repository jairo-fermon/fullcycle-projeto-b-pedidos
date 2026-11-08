import { randomUUID } from 'node:crypto';

const baseUrl = process.env.BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3000'}`;
const call = async (method, path, body, expected) => {
  const response = await fetch(new URL(path, baseUrl), { method,
    ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  console.log(JSON.stringify({ method, path, status: response.status, requestId: response.headers.get('x-request-id'), data }));
  if (response.status !== expected) throw new Error(`Esperado ${expected}, recebido ${response.status}`);
  return data;
};
const order = await call('POST', '/orders', { items: [{ sku: 'CANETA-AZUL', quantity: 2, unitPriceCents: 1500 }] }, 201);
if (order.totalCents !== 3000 || order.status !== 'PENDING') throw new Error('Criação incorreta.');
await call('GET', `/orders/${order.id}`, null, 200);
const confirmed = await call('POST', `/orders/${order.id}/confirm`, null, 200);
if (confirmed.status !== 'CONFIRMED') throw new Error('Confirmação incorreta.');
await call('GET', `/orders/${order.id}`, null, 200);
await call('POST', `/orders/${order.id}/confirm`, null, 409);
await call('GET', `/orders/${randomUUID()}`, null, 404);
console.log(JSON.stringify({ result: 'PASSOU', orderId: order.id }));
