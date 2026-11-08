import { describe, expect, it, vi } from 'vitest';
import { Writable } from 'node:stream';
import { buildApp } from '../../src/app.js';
import type { OrderRepository } from '../../src/application/order-repository.js';

function failingRepo(): OrderRepository {
  return {
    create: vi.fn(async () => { throw new Error('SQL password=nao-expor'); }),
    findById: vi.fn(async () => null), confirm: vi.fn(async () => 'not_found' as const),
    ping: vi.fn(async () => { throw new Error('senha-da-conexao'); })
  };
}
describe('Erros HTTP e observabilidade', () => {
  it('oculta erro do driver e conteúdo sensível dos logs e resposta', async () => {
    const lines: string[] = [];
    const stream = new Writable({ write(chunk, _encoding, callback) { lines.push(String(chunk)); callback(); } });
    const app = buildApp(failingRepo(), { logStream: stream });
    try {
      const response = await app.inject({ method: 'POST', url: '/orders', headers: { authorization: 'Bearer segredo', cookie: 'session=segredo' },
        payload: { items: [{ sku: 'SKU-SENSIVEL', quantity: 1, unitPriceCents: 10 }] } });
      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR', requestId: response.headers['x-request-id'] } });
      expect(response.body).not.toContain('password');
      const log = lines.join('');
      for (const sensitive of ['segredo', 'SKU-SENSIVEL', 'nao-expor']) expect(log).not.toContain(sensitive);
      const completed = lines.flatMap(line => line.trim().split('\n')).map(line => JSON.parse(line) as Record<string, unknown>).find(line => line.msg === 'request_completed');
      expect(completed).toMatchObject({ method: 'POST', route: '/orders', status: 500, reqId: response.headers['x-request-id'] });
      expect(completed?.durationMs).toBeTypeOf('number');
    } finally { await app.close(); }
  });
  it('health falha com dependência indisponível; erros de rota/corpo são determinísticos', async () => {
    const app = buildApp(failingRepo(), { logLevel: 'silent' });
    try {
      expect((await app.inject('/health')).statusCode).toBe(503);
      expect((await app.inject('/nao-existe')).json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
      const invalid = await app.inject({ method: 'POST', url: '/orders', payload: { items: [] } });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toMatchObject({ error: { code: 'INVALID_INPUT' } });
      const malformed = await app.inject({ method: 'POST', url: '/orders', headers: { 'content-type': 'application/json' }, payload: '{' });
      expect(malformed.statusCode).toBe(400);
      expect((await app.inject('/metrics')).body).toContain('http_requests_total{method="GET",route="/health",status="503"} 1');
    } finally { await app.close(); }
  });
});
