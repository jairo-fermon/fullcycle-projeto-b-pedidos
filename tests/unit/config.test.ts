import { describe, expect, it } from 'vitest';
import { readConfig } from '../../src/config.js';

const env = { PGHOST: 'db', PGDATABASE: 'orders_test', PGUSER: 'test', PGPASSWORD: 'apenas-no-teste' };
describe('Configuração externa', () => {
  it('lê valores obrigatórios e defaults seguros', () => {
    expect(readConfig(env)).toMatchObject({ port: 3000, host: '0.0.0.0', logLevel: 'info', database: { host: 'db', port: 5432, database: 'orders_test' } });
  });
  it('respeita valores de ambiente', () => {
    expect(readConfig({ ...env, PORT: '4321', PGPORT: '5433', LOG_LEVEL: 'silent', HOST: '127.0.0.1' }))
      .toMatchObject({ port: 4321, logLevel: 'silent', host: '127.0.0.1', database: { port: 5433 } });
  });
  it.each(['0', '-1', '65536', 'abc', '1.5'])('rejeita porta inválida %s', port => {
    expect(() => readConfig({ ...env, PORT: port })).toThrow('Porta inválida');
  });
  it('exige credenciais e valida nível de log sem imprimir segredos', () => {
    expect(() => readConfig({ ...env, PGPASSWORD: '' })).toThrow('PGPASSWORD');
    expect(() => readConfig({ ...env, LOG_LEVEL: 'qualquer' })).toThrow('LOG_LEVEL');
  });
});
