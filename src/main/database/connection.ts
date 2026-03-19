import { Pool, PoolClient } from 'pg';

// Duck type for both Pool and PoolClient query interface
interface Queryable {
  query(sql: string, params?: any[]): Promise<{ rows: any[]; rowCount: number | null }>;
}

export interface TransactionContext {
  prepare(sql: string): PreparedStatement;
}

class DatabaseWrapper {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this.pool, sql);
  }

  async transact<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txCtx: TransactionContext = {
        prepare: (sql: string) => new PreparedStatement(client, sql),
      };
      const result = await fn(txCtx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }
}

type SqlValue = string | number | boolean | null | undefined;

class PreparedStatement {
  private queryable: Queryable;
  private sql: string;

  constructor(queryable: Queryable, sql: string) {
    this.queryable = queryable;
    this.sql = this.convertPlaceholders(sql);
  }

  // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
  private convertPlaceholders(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  async get(...params: SqlValue[]): Promise<Record<string, unknown> | undefined> {
    const result = await this.queryable.query(this.sql, params);
    return result.rows[0] as Record<string, unknown> | undefined;
  }

  async all(...params: SqlValue[]): Promise<Record<string, unknown>[]> {
    const result = await this.queryable.query(this.sql, params);
    return result.rows as Record<string, unknown>[];
  }

  async run(...params: SqlValue[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = await this.queryable.query(this.sql, params);

    // Try to get the last inserted ID if it was an INSERT with RETURNING
    let lastInsertRowid = 0;
    if (result.rows.length > 0 && 'id' in (result.rows[0] as Record<string, unknown>)) {
      lastInsertRowid = (result.rows[0] as Record<string, unknown>).id as number;
    }

    return {
      changes: result.rowCount ?? 0,
      lastInsertRowid,
    };
  }
}

let db: DatabaseWrapper | null = null;

export function getDatabase(): DatabaseWrapper {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(port: number): Promise<DatabaseWrapper> {
  if (db) {
    return db;
  }

  const pool = new Pool({
    host: '127.0.0.1',
    port,
    user: 'postgres',
    database: 'bigtal',
    max: 10,
  });

  // Verify connection
  const client = await pool.connect();
  client.release();

  db = new DatabaseWrapper(pool);

  console.log(`Connected to PostgreSQL on port ${port}`);

  // Create migrations table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  return db;
}

export async function resetDatabase(): Promise<void> {
  if (db) {
    // Drop all tables in the public schema
    await db.exec(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

export function isDatabaseInitialized(): boolean {
  return db !== null;
}
