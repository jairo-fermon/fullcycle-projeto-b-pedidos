import { Pool } from 'pg';
import { readConfig } from '../dist/config.js';
import { migrate } from '../dist/infrastructure/migrate.js';
import { PostgresOrderRepository } from '../dist/infrastructure/postgres-order-repository.js';
import { buildApp } from '../dist/app.js';

let pool;
let app;
try {
  const config = readConfig(process.env);
  pool = new Pool(config.database);
  pool.on('error', () => app?.log.error({ code: 'DATABASE_CONNECTION_ERROR' }, 'database_connection_failed'));
  await migrate(pool);
  app = buildApp(new PostgresOrderRepository(pool), { logLevel: config.logLevel });
  await app.listen({ port: config.port, host: config.host });
  const shutdown = async () => { await app.close(); await pool.end(); };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
} catch {
  console.error(JSON.stringify({ level: 50, code: 'STARTUP_FAILED', message: 'Verifique configuração, banco e migrations.' }));
  await app?.close();
  await pool?.end();
  process.exitCode = 1;
}
