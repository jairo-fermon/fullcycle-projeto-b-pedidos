import type { FastifyInstance } from 'fastify';
import type { OrderService } from '../application/order-service.js';

const idSchema = { type: 'object', additionalProperties: false, required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } };
const bodySchema = {
  type: 'object', additionalProperties: false, required: ['items'], properties: {
    items: { type: 'array', minItems: 1, maxItems: 100, items: {
      type: 'object', additionalProperties: false, required: ['sku', 'quantity', 'unitPriceCents'], properties: {
        sku: { type: 'string', minLength: 1, maxLength: 64, pattern: '^\\S(?:.*\\S)?$' },
        quantity: { type: 'integer', minimum: 1, maximum: 1000 },
        unitPriceCents: { type: 'integer', minimum: 1, maximum: 1000000 }
      }
    } }
  }
};

export async function orderRoutes(app: FastifyInstance, service: OrderService): Promise<void> {
  app.post<{ Body: { items: unknown } }>('/orders', { schema: { body: bodySchema } }, async (request, reply) => {
    const order = await service.create(request.body.items);
    return reply.code(201).header('location', `/orders/${order.id}`).send(order);
  });
  app.get<{ Params: { id: string } }>('/orders/:id', { schema: { params: idSchema } }, request => service.get(request.params.id));
  app.post<{ Params: { id: string } }>('/orders/:id/confirm', { schema: { params: idSchema } }, request => service.confirm(request.params.id));
}
