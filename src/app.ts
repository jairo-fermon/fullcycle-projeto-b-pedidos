import Fastify, { LogController } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';
import { OrderService } from './application/order-service.js';
import type { OrderRepository } from './application/order-repository.js';
import { OrderError } from './domain/order.js';
import { orderRoutes } from './http/order-routes.js';
import { observe } from './observability.js';

export function buildApp(repository: OrderRepository, options: { logLevel?: string; logStream?: Writable } = {}) {
  const app = Fastify({
    logger: { level: options.logLevel ?? 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      ...(options.logStream ? { stream: options.logStream } : {}) },
    logController: new LogController({ disableRequestLogging: true }),
    genReqId: () => randomUUID(),
    bodyLimit: 65536,
    ajv: { customOptions: { coerceTypes: false, removeAdditional: false } }
  });
  const registry = observe(app);
  app.addHook('onRequest', async (request, reply) => { reply.header('x-request-id', request.id); });
  app.setErrorHandler((error, request, reply) => {
    const httpError: { validation?: unknown; statusCode?: number } = error instanceof Error
      ? error as Error & { validation?: unknown; statusCode?: number } : {};
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Erro interno. Consulte o identificador da requisição.';
    if (error instanceof OrderError) {
      status = { INVALID_INPUT: 400, NOT_FOUND: 404, ALREADY_CONFIRMED: 409 }[error.code];
      code = error.code;
      message = error.message;
    } else if (httpError.validation || (httpError.statusCode && httpError.statusCode >= 400 && httpError.statusCode < 500)) {
      status = httpError.statusCode ?? 400;
      code = 'INVALID_INPUT'; message = 'Requisição inválida.';
    }
    // Não registrar erro bruto de driver: pode incluir SQL, dados ou credenciais.
    if (status >= 500) request.log.error({ code }, 'request_failed');
    reply.code(status).send({ error: { code, message, requestId: request.id } });
  });
  app.setNotFoundHandler((request, reply) => reply.code(404).send({ error: {
    code: 'NOT_FOUND', message: 'Rota não encontrada.', requestId: request.id
  } }));
  app.register(async routes => { await orderRoutes(routes, new OrderService(repository)); });
  app.get('/health', async (_request, reply) => {
    try { await repository.ping(); return { status: 'ok' }; }
    catch { return reply.code(503).send({ status: 'unavailable' }); }
  });
  app.get('/metrics', async (_request, reply) => reply.type(registry.contentType).send(await registry.metrics()));
  return app;
}
