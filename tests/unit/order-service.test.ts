import { describe, expect, it, vi } from 'vitest';
import { createOrder } from '../../src/domain/order.js';
import type { OrderRepository } from '../../src/application/order-repository.js';
import { OrderService } from '../../src/application/order-service.js';

function setup() {
  const order = createOrder([{ sku: 'ITEM', quantity: 1, unitPriceCents: 99 }]);
  const repo: OrderRepository = {
    create: vi.fn(async value => value), findById: vi.fn(async () => order),
    confirm: vi.fn(async () => 'confirmed' as const), ping: vi.fn(async () => {})
  };
  return { order, repo, service: new OrderService(repo) };
}
describe('Serviço de pedidos: persistência por interface', () => {
  it('encaminha pedido válido com total calculado e não persiste entrada inválida', async () => {
    const { service, repo } = setup();
    const order = await service.create([{ sku: 'ITEM', quantity: 2, unitPriceCents: 101 }]);
    expect(order.totalCents).toBe(202);
    expect(repo.create).toHaveBeenCalledWith(order);
    await expect(service.create([])).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(repo.create).toHaveBeenCalledTimes(1);
  });
  it('retorna pedido ou erro de ausência', async () => {
    const { service, repo, order } = setup();
    expect(await service.get(order.id)).toBe(order);
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(service.get(order.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('consulta novamente após confirmação', async () => {
    const { service, repo, order } = setup();
    const confirmed = { ...order, status: 'CONFIRMED' as const, confirmedAt: new Date().toISOString() };
    vi.mocked(repo.findById).mockResolvedValueOnce(order).mockResolvedValueOnce(confirmed);
    expect(await service.confirm(order.id)).toEqual(confirmed);
    expect(repo.confirm).toHaveBeenCalledWith(order.id);
  });
  it.each(['already_confirmed', 'not_found'] as const)('propaga resultado atômico %s de uma corrida', async result => {
    const { service, repo, order } = setup();
    vi.mocked(repo.confirm).mockResolvedValue(result);
    await expect(service.confirm(order.id)).rejects.toMatchObject({ code: result === 'not_found' ? 'NOT_FOUND' : 'ALREADY_CONFIRMED' });
  });
  it('não confirma novamente pedido já confirmado', async () => {
    const { service, repo, order } = setup();
    vi.mocked(repo.findById).mockResolvedValue({ ...order, status: 'CONFIRMED', confirmedAt: new Date().toISOString() });
    await expect(service.confirm(order.id)).rejects.toMatchObject({ code: 'ALREADY_CONFIRMED' });
    expect(repo.confirm).not.toHaveBeenCalled();
  });
});
