import type { PoolConfig } from 'pg';

export function readConfig(env: NodeJS.ProcessEnv) {
  const required = (key: string): string => {
    const value = env[key];
    if (!value?.trim()) throw new Error(`Configuração obrigatória ausente: ${key}`);
    return value;
  };
  const positivePort = (value: string): number => {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
    return port;
  };
  const logLevel = env.LOG_LEVEL ?? 'info';
  if (!['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(logLevel)) {
    throw new Error('LOG_LEVEL inválido.');
  }
  const database: PoolConfig = {
    host: required('PGHOST'), port: positivePort(env.PGPORT ?? '5432'),
    database: required('PGDATABASE'), user: required('PGUSER'), password: required('PGPASSWORD'),
    max: 10, connectionTimeoutMillis: 5000, statement_timeout: 5000
  };
  return { database, port: positivePort(env.PORT ?? '3000'), host: env.HOST ?? '0.0.0.0', logLevel };
}
