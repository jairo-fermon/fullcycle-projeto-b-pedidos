import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const createDuration = new Trend('create_order_duration', true);
export const options = {
  vus: 1, duration: '30s',
  thresholds: {
    create_order_duration: ['p(95)<500'],
    http_req_failed: ['rate==0'],
    checks: ['rate==1']
  }
};
const baseUrl = __ENV.BASE_URL;
if (!baseUrl) throw new Error('BASE_URL obrigatória.');
export default function () {
  const response = http.post(`${baseUrl}/orders`, JSON.stringify({ items: [{ sku: 'SMOKE-ITEM', quantity: 2, unitPriceCents: 1500 }] }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /orders' } });
  createDuration.add(response.timings.duration);
  const created = check(response, { 'pedido criado com total correto': r => r.status === 201 && r.json('totalCents') === 3000 && r.json('status') === 'PENDING' });
  if (!created) return;
  const id = response.json('id');
  check(http.get(`${baseUrl}/orders/${id}`, { tags: { name: 'GET /orders/:id' } }), { 'pedido persistido': r => r.status === 200 && r.json('id') === id });
  check(http.post(`${baseUrl}/orders/${id}/confirm`, null, { tags: { name: 'POST /orders/:id/confirm' } }), { 'pedido confirmado': r => r.status === 200 && r.json('status') === 'CONFIRMED' });
  check(http.get(`${baseUrl}/orders/${id}`, { tags: { name: 'GET /orders/:id' } }), { 'status atualizado persistido': r => r.status === 200 && r.json('status') === 'CONFIRMED' });
  sleep(1);
}
