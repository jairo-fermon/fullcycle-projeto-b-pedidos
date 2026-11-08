import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { parse } from 'yaml';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { createRequire } from 'node:module';
import type { FormatOptions, FormatName } from 'ajv-formats';
import type { Plugin } from 'ajv';
import { buildApp } from '../../src/app.js';
import { readConfig } from '../../src/config.js';
import { createOrder } from '../../src/domain/order.js';
import { PostgresOrderRepository } from '../../src/infrastructure/postgres-order-repository.js';
import { migrate } from '../../src/infrastructure/migrate.js';

// Sem skip: configuração ausente ou banco não isolado deve falhar localmente e na CI.
if (!process.env.PGDATABASE?.endsWith('_test')) throw new Error('Integração requer PGDATABASE terminando em _test.');
const pool = new Pool(readConfig(process.env).database);
const repository = new PostgresOrderRepository(pool);
const app = buildApp(repository, { logLevel: 'silent' });
let baseUrl: string;
const validBody = { items: [{ sku: 'CANETA-AZUL', quantity: 2, unitPriceCents: 1500 }, { sku: 'CADERNO', quantity: 3, unitPriceCents: 101 }] };
const spec = parse(await readFile(new URL('../../docs/openapi.yaml', import.meta.url), 'utf8')) as {
  components: { schemas: Record<string, object> };
  paths: Record<string, { post?: { requestBody?: { content: { 'application/json': { example: unknown } } } } }>;
};
const ajv = new Ajv2020({ strict: false });
const addFormats = createRequire(import.meta.url)('ajv-formats') as Plugin<FormatName[] | FormatOptions>;
addFormats(ajv);
function assertSchema(name: string, value: unknown) {
  const validate = ajv.compile({ components: spec.components, $ref: `#/components/schemas/${name}` });
  expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
}
async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(new URL(path, baseUrl), { method,
    ...(body !== undefined ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  return { response, data: await response.json() };
}

beforeAll(async () => {
  await migrate(pool);
  await migrate(pool); // Reinício não reaplica nem apaga tabelas.
  baseUrl = await app.listen({ host: '127.0.0.1', port: 0 });
});
afterAll(async () => { await app.close(); await pool.end(); });

describe('API por HTTP real + PostgreSQL real', () => {
  it('executa fluxo completo, consulta SQL e valida contrato de resposta', async () => {
    assertSchema('CreateOrder', validBody);
    const { response, data } = await call('POST', '/orders', validBody);
    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(`/orders/${data.id}`);
    expect(data.totalCents).toBe(3303);
    expect(data.status).toBe('PENDING');
    assertSchema('Order', data);
    const stored = await pool.query('SELECT status,total_cents FROM orders WHERE id=$1', [data.id]);
    expect(stored.rows).toEqual([{ status: 'PENDING', total_cents: '3303' }]);
    expect((await call('GET', `/orders/${data.id}`)).data).toEqual(data);
    const confirmed = await call('POST', `/orders/${data.id}/confirm`);
    expect(confirmed.response.status).toBe(200);
    expect(confirmed.data.status).toBe('CONFIRMED');
    expect(confirmed.data.confirmedAt).toBeTypeOf('string');
    assertSchema('Order', confirmed.data);
    expect((await call('GET', `/orders/${data.id}`)).data).toEqual(confirmed.data);
    const repeated = await call('POST', `/orders/${data.id}/confirm`);
    expect(repeated.response.status).toBe(409);
    assertSchema('Error', repeated.data);
    expect(repeated.data.error.code).toBe('ALREADY_CONFIRMED');
  });
  it('confirma apenas uma vez sob requisições simultâneas', async () => {
    const { data } = await call('POST', '/orders', validBody);
    const results = await Promise.all(Array.from({ length: 8 }, () => call('POST', `/orders/${data.id}/confirm`)));
    expect(results.map(r => r.response.status).sort()).toEqual([200, 409, 409, 409, 409, 409, 409, 409]);
    expect((await repository.findById(data.id))?.status).toBe('CONFIRMED');
  });
  it('sobrevive à recriação do app/pool sem perder pedido', async () => {
    const { data } = await call('POST', '/orders', validBody);
    const secondPool = new Pool(readConfig(process.env).database);
    const secondApp = buildApp(new PostgresOrderRepository(secondPool), { logLevel: 'silent' });
    try {
      const secondUrl = await secondApp.listen({ host: '127.0.0.1', port: 0 });
      const result = await fetch(`${secondUrl}/orders/${data.id}`);
      expect(result.status).toBe(200);
      expect(await result.json()).toEqual(data);
    } finally { await secondApp.close(); await secondPool.end(); }
  });
  it('documenta exemplo de criação realmente aceito', async () => {
    const example = spec.paths['/orders']?.post?.requestBody?.content['application/json'].example;
    assertSchema('CreateOrder', example);
    const result = await call('POST', '/orders', example);
    expect(result.response.status).toBe(201);
    expect(result.data.totalCents).toBe(3000);
  });
  it.each([
    {}, { items: [] }, { items: validBody.items, totalCents: 1 },
    { items: [{ sku: 'SKU', quantity: '2', unitPriceCents: 10 }] },
    { items: [{ sku: ' ', quantity: 1, unitPriceCents: 10 }] },
    { items: [{ sku: 'SKU', quantity: 1, unitPriceCents: 1.5 }] },
    { items: [{ sku: 'SKU', quantity: 0, unitPriceCents: 10 }] },
    { items: [{ sku: 'SKU', quantity: 1, unitPriceCents: 1000001 }] }
  ])('rejeita entrada HTTP inválida %# sem gravar', async body => {
    const before = await pool.query('SELECT count(*) FROM orders');
    const result = await call('POST', '/orders', body);
    expect(result.response.status).toBe(400);
    assertSchema('Error', result.data);
    expect((await pool.query('SELECT count(*) FROM orders')).rows).toEqual(before.rows);
  });
  it('retorna 400 para UUID inválido e 404 para UUID inexistente', async () => {
    expect((await call('GET', '/orders/invalido')).response.status).toBe(400);
    expect((await call('POST', '/orders/invalido/confirm')).response.status).toBe(400);
    for (const [method, path] of [['GET', `/orders/${randomUUID()}`], ['POST', `/orders/${randomUUID()}/confirm`]]) {
      const result = await call(method!, path!);
      expect(result.response.status).toBe(404);
      expect(result.data.error.code).toBe('NOT_FOUND');
      assertSchema('Error', result.data);
    }
  });
  it('rollback real remove pedido quando inclusão de item viola restrição', async () => {
    const order = createOrder(validBody.items);
    order.items[1]!.quantity = 0;
    await expect(repository.create(order)).rejects.toMatchObject({ code: '23514' });
    expect(await repository.findById(order.id)).toBeNull();
    expect((await pool.query('SELECT count(*) FROM order_items WHERE order_id=$1', [order.id])).rows[0].count).toBe('0');
  });
  it('repositório distingue ausência e confirmação repetida', async () => {
    expect(await repository.confirm(randomUUID())).toBe('not_found');
    const order = await repository.create(createOrder(validBody.items));
    expect(await repository.confirm(order.id)).toBe('confirmed');
    expect(await repository.confirm(order.id)).toBe('already_confirmed');
  });
  it('migration detecta mudança de checksum e preserva histórico', async () => {
    const before = await pool.query('SELECT sha256 FROM schema_migrations WHERE name=$1', ['001-create-orders.sql']);
    try {
      await pool.query('UPDATE schema_migrations SET sha256=$1 WHERE name=$2', ['alterado-no-teste', '001-create-orders.sql']);
      await expect(migrate(pool)).rejects.toThrow('Migration aplicada foi alterada');
    } finally {
      await pool.query('UPDATE schema_migrations SET sha256=$1 WHERE name=$2', [before.rows[0].sha256, '001-create-orders.sql']);
    }
    await expect(migrate(pool)).resolves.toBeUndefined();
  });
  it('health verifica banco e métrica muda com requisições reais, sem ID como label', async () => {
    expect((await call('GET', '/health')).data).toEqual({ status: 'ok' });
    const before = await (await fetch(`${baseUrl}/metrics`)).text();
    const { data } = await call('POST', '/orders', validBody);
    await call('GET', `/orders/${data.id}`);
    const after = await (await fetch(`${baseUrl}/metrics`)).text();
    expect(after).not.toEqual(before);
    expect(after).toContain('route="/orders/:id",status="200"');
    expect(after).toContain('http_request_duration_seconds_bucket');
    expect(after).not.toContain(data.id);
  });
});
