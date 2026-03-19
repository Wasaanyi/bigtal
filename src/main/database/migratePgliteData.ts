import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDatabase } from './connection';

// Tables in dependency order (parents before children)
// NOTE: 'migrations' is intentionally excluded — the new app manages its own migration tracking
const TABLES_IN_ORDER = [
  'currencies',
  'users',
  'customers',
  'suppliers',
  'product_categories',
  'products',
  'invoices',
  'invoice_items',
  'expenses',
  'donations',
  'app_settings',
  'inventory_movements',
];

/**
 * Checks if there is a legacy PGlite database that needs migration.
 * Returns true if bigtal-pg (or bigtal-pg-backup from a prior failed attempt)
 * exists but bigtal-pgdata does NOT yet have a migrated marker.
 */
export function needsPgliteMigration(): boolean {
  const userDataPath = app.getPath('userData');
  const pglitePath = path.join(userDataPath, 'bigtal-pg');
  const backupPath = path.join(userDataPath, 'bigtal-pg-backup');
  const markerPath = path.join(userDataPath, 'bigtal-pgdata', '.pglite-migrated');

  // If marker exists, check if we actually have data (marker may be stale from a failed attempt)
  if (fs.existsSync(markerPath)) {
    // If original source still exists, the previous migration failed — delete stale marker
    if (fs.existsSync(pglitePath)) {
      try { fs.unlinkSync(markerPath); } catch { /* ignore */ }
      return true;
    }
    return false;
  }

  // Check for source directory (original or backup from prior failed rename)
  if (fs.existsSync(pglitePath)) {
    return true;
  }

  // If only backup exists (prior attempt renamed but didn't complete), restore it
  if (fs.existsSync(backupPath)) {
    try {
      fs.renameSync(backupPath, pglitePath);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Migrates data from an existing PGlite database to the new PostgreSQL database.
 * This is a one-time operation on first launch after upgrading.
 *
 * Assumes runMigrations() has already been called so all tables exist with seed data.
 */
export async function migrateFromPglite(): Promise<void> {
  if (!needsPgliteMigration()) {
    return;
  }

  const userDataPath = app.getPath('userData');
  const pglitePath = path.join(userDataPath, 'bigtal-pg');

  console.log('PGlite migration: detected legacy database at', pglitePath);

  let pglite: any;
  try {
    // Dynamically import PGlite (kept as dependency for migration)
    const { PGlite } = require('@electric-sql/pglite');
    pglite = new PGlite(pglitePath);

    // Wait for WASM initialization to complete
    if (pglite.waitReady) await pglite.waitReady;
    else if (pglite.ready) await pglite.ready;
  } catch (err) {
    console.error('PGlite migration: failed to open legacy database:', err);
    console.warn('PGlite migration: skipping (PGlite dependency may have been removed)');
    // Don't write marker — leave source intact so user can retry after fixing
    return;
  }

  const db = getDatabase();
  let totalRowsMigrated = 0;

  try {
    // Read and migrate each table
    for (const table of TABLES_IN_ORDER) {
      try {
        const result = await pglite.query(`SELECT * FROM ${table}`);
        const rows = result.rows as Record<string, any>[];

        if (!rows || rows.length === 0) {
          console.log(`PGlite migration: ${table} — 0 rows (skipped)`);
          continue;
        }

        // Get column names from first row
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map((_: string, i: number) => `$${i + 1}`).join(', ');
        const columnList = columns.map((c) => `"${c}"`).join(', ');
        const insertSql = `INSERT INTO ${table} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

        // Delete seed data before inserting PGlite data so user's real data replaces it
        await db.exec(`DELETE FROM ${table}`);

        // Insert rows in batches within a transaction
        await db.transact(async (tx) => {
          for (const row of rows) {
            const values = columns.map((col) => row[col]);
            await tx.prepare(insertSql).run(...values);
          }
        });

        totalRowsMigrated += rows.length;
        console.log(`PGlite migration: ${table} — ${rows.length} rows migrated`);
      } catch (err) {
        // Table might not exist in old schema (e.g., inventory_movements)
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        if (msg.includes('does not exist') || msg.includes('relation')) {
          console.log(`PGlite migration: ${table} — not found in legacy database (skipped)`);
        } else {
          console.warn(`PGlite migration: ${table} — error:`, err);
        }
      }
    }

    // Reset serial sequences so new inserts don't collide
    for (const table of TABLES_IN_ORDER) {
      try {
        await db.exec(`
          SELECT setval(
            pg_get_serial_sequence('${table}', 'id'),
            COALESCE((SELECT MAX(id) FROM ${table}), 1)
          )
        `);
      } catch {
        // Table may not have an id column or serial sequence
      }
    }

    console.log('PGlite migration: sequences reset');

    if (totalRowsMigrated > 0) {
      // Success — rename old directory as backup and write marker
      const backupPath = path.join(userDataPath, 'bigtal-pg-backup');
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
      fs.renameSync(pglitePath, backupPath);
      console.log('PGlite migration: old database moved to', backupPath);

      writeMigrationMarker();
      console.log(`PGlite migration: complete (${totalRowsMigrated} total rows migrated)`);
    } else {
      console.warn('PGlite migration: no rows were migrated — leaving source intact for retry');
    }

  } catch (err) {
    console.error('PGlite migration: failed:', err);
    // Don't rename source or write marker — leave intact for retry
  } finally {
    try {
      await pglite.close();
    } catch { /* ignore */ }
  }
}

function writeMigrationMarker(): void {
  const markerPath = path.join(app.getPath('userData'), 'bigtal-pgdata', '.pglite-migrated');
  try {
    fs.writeFileSync(markerPath, new Date().toISOString());
  } catch { /* ignore */ }
}
