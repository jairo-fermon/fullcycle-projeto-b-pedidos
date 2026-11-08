import { Counter, Histogram, Registry } from '@prometheus-io/client';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export function observe(app: FastifyInstance): Registry {
  const registry = new Registry();
  const labels = ['method', 'route', 'status'] as const;
  const count = new Counter({ name: 'http_requests_total', help: 'Requisições HTTP concluídas.', labelNames: labels, registers: [registry] });
  const duration = new Histogram({ name: 'http_request_duration_seconds', help: 'Duração HTTP em segundos.',
    labelNames: labels, buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5], registers: [registry] });
  const starts = new WeakMap<FastifyRequest, bigint>();
  app.addHook('onRequest', async request => { starts.set(request, process.hrtime.bigint()); });
  app.addHook('onResponse', async (request, reply) => {
    const seconds = Number(process.hrtime.bigint() - starts.get(request)!) / 1e9;
    const route = request.routeOptions.url ?? 'unmatched';
    if (route !== '/metrics') {
      const values = { method: request.method, route, status: String(reply.statusCode) };
      count.inc(values);
      duration.observe(values, seconds);
    }
    request.log.info({ method: request.method, route, status: reply.statusCode, durationMs: seconds * 1000 }, 'request_completed');
  });
  return registry;
}
