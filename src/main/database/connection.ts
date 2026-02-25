import { PGlite } from '@electric-sql/pglite';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Wrapper to provide a similar API to better-sqlite3
class DatabaseWrapper {
  private pglite: PGlite;

  constructor(pglite: PGlite) {
    this.pglite = pglite;
  }

  async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this.pglite, sql);
  }

  transaction<T>(fn: () => T): () => Promise<T> {
    return async () => {
      await this.pglite.exec('BEGIN');
      try {
        const result = fn();
        await this.pglite.exec('COMMIT');
        return result;
      } catch (error) {
        await this.pglite.exec('ROLLBACK');
        throw error;
      }
    };
  }

  async close(): Promise<void> {
    await this.pglite.close();
  }

  getPglite(): PGlite {
    return this.pglite;
  }
}

type SqlValue = string | number | boolean | null | undefined;

class PreparedStatement {
  private pglite: PGlite;
  private sql: string;

  constructor(pglite: PGlite, sql: string) {
    this.pglite = pglite;
    this.sql = this.convertPlaceholders(sql);
  }

  // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
  private convertPlaceholders(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  async get(...params: SqlValue[]): Promise<Record<string, unknown> | undefined> {
    const result = await this.pglite.query(this.sql, params);
    return result.rows[0] as Record<string, unknown> | undefined;
  }

  async all(...params: SqlValue[]): Promise<Record<string, unknown>[]> {
    const result = await this.pglite.query(this.sql, params);
    return result.rows as Record<string, unknown>[];
  }

  async run(...params: SqlValue[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const result = await this.pglite.query(this.sql, params);

    // Try to get the last inserted ID if it was an INSERT with RETURNING
    let lastInsertRowid = 0;
    if (result.rows.length > 0 && 'id' in (result.rows[0] as Record<string, unknown>)) {
      lastInsertRowid = (result.rows[0] as Record<string, unknown>).id as number;
    }

    return {
      changes: result.affectedRows ?? 0,
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

export async function initDatabase(): Promise<DatabaseWrapper> {
  if (db) {
    return db;
  }

  // Get the user data directory
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'bigtal-pg');

  // Ensure directory exists
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  console.log('Database path:', dbPath);

  // Initialize PGlite with persistent storage
  const pglite = new PGlite(dbPath);

  db = new DatabaseWrapper(pglite);

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

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

export function isDatabaseInitialized(): boolean {
  return db !== null;
}
