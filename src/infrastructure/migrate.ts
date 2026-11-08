import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(742905)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, sha256 TEXT NOT NULL)');
    const directory = new URL('../../migrations/', import.meta.url);
    const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
    for (const name of names) {
      const sql = await readFile(new URL(name, directory), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      const applied = await client.query<{ sha256: string }>('SELECT sha256 FROM schema_migrations WHERE name=$1', [name]);
      if (applied.rows[0]) {
        if (applied.rows[0].sha256 !== hash) throw new Error(`Migration aplicada foi alterada: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)', [name, hash]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
