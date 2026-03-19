import { dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { closeDatabase, initDatabase } from '../database/connection';
import { postgresManager } from '../database/postgresManager';
import { runMigrations } from '../database/migrations';

export const databaseBackupService = {
  /**
   * Exports the database using pg_dump to a custom-format backup file.
   */
  async exportDatabase(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const port = postgresManager.getPort();
      const defaultFileName = `bigtal-backup-${new Date().toISOString().slice(0, 10)}`;

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Database Backup',
        defaultPath: defaultFileName,
        filters: [
          { name: 'Bigtal Backup', extensions: ['bigtal-backup'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      const finalPath = filePath.endsWith('.bigtal-backup') ? filePath : `${filePath}.bigtal-backup`;

      // Create a directory-style backup with pg_dump output + manifest
      if (fs.existsSync(finalPath)) {
        fs.rmSync(finalPath, { recursive: true, force: true });
      }
      fs.mkdirSync(finalPath, { recursive: true });

      // Run pg_dump in custom format
      const pgDump = postgresManager.getBinFile('pg_dump');
      const dumpFile = path.join(finalPath, 'bigtal.dump');

      execFileSync(pgDump, [
        '-h', '127.0.0.1',
        '-p', String(port),
        '-U', 'postgres',
        '-d', 'bigtal',
        '-F', 'c',
        '-f', dumpFile,
      ], { env: postgresManager.makeEnv(), stdio: 'pipe' });

      // Write manifest
      const manifest = {
        version: '2.0',
        created: new Date().toISOString(),
        app: 'Bigtal',
        format: 'pg_dump_custom',
      };
      fs.writeFileSync(path.join(finalPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

      return { success: true, filePath: finalPath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Imports a database from a backup file (supports both v2.0 pg_dump and v1.0 PGlite backups).
   */
  async importDatabase(): Promise<{ success: boolean; error?: string }> {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Database Backup',
        filters: [
          { name: 'Bigtal Backup', extensions: ['bigtal-backup'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openDirectory'],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const backupPath = filePaths[0];

      // Verify this is a valid backup
      const manifestPath = path.join(backupPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        return { success: false, error: 'Invalid backup file: missing manifest' };
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.app !== 'Bigtal') {
        return { success: false, error: 'Invalid backup file: not a Bigtal backup' };
      }

      const port = postgresManager.getPort();

      if (manifest.version === '2.0') {
        // v2.0 — pg_dump custom format
        return await this.importV2(backupPath, port);
      } else {
        // v1.0 — legacy PGlite directory backup
        return await this.importV1Legacy(backupPath, port);
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async importV2(backupPath: string, port: number): Promise<{ success: boolean; error?: string }> {
    const dumpFile = path.join(backupPath, 'bigtal.dump');
    if (!fs.existsSync(dumpFile)) {
      return { success: false, error: 'Invalid backup: missing dump file' };
    }

    // Close current connection
    await closeDatabase();

    try {
      // Drop and recreate the database
      const dropdb = postgresManager.getBinFile('dropdb');
      const createdb = postgresManager.getBinFile('createdb');
      const pgRestore = postgresManager.getBinFile('pg_restore');
      const env = postgresManager.makeEnv();

      try {
        execFileSync(dropdb, [
          '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'bigtal',
        ], { env, stdio: 'pipe' });
      } catch { /* may not exist */ }

      execFileSync(createdb, [
        '-h', '127.0.0.1', '-p', String(port), '-U', 'postgres', 'bigtal',
      ], { env, stdio: 'pipe' });

      // Restore from dump
      execFileSync(pgRestore, [
        '-h', '127.0.0.1',
        '-p', String(port),
        '-U', 'postgres',
        '-d', 'bigtal',
        '--no-owner',
        '--no-privileges',
        dumpFile,
      ], { env, stdio: 'pipe' });

      // Reconnect
      await initDatabase(port);
      await runMigrations();

      return { success: true };
    } catch (restoreError) {
      // Try to reconnect
      try {
        await initDatabase(port);
        await runMigrations();
      } catch { /* ignore */ }
      throw restoreError;
    }
  },

  async importV1Legacy(backupPath: string, port: number): Promise<{ success: boolean; error?: string }> {
    // v1.0 PGlite backup — the backup directory IS a copy of the PGlite data directory
    // (with manifest.json added on top). PGlite needs write access (WAL, lock files),
    // so we copy to a temp directory to avoid issues with read-only backups or stale locks.
    const tempDir = path.join(app.getPath('temp'), `bigtal-pglite-import-${Date.now()}`);
    let pglite: any;

    try {
      // Copy backup to writable temp directory
      fs.cpSync(backupPath, tempDir, { recursive: true });

      // Remove non-PGlite files that were added by the v1 export
      const tempManifest = path.join(tempDir, 'manifest.json');
      if (fs.existsSync(tempManifest)) fs.unlinkSync(tempManifest);

      // Remove stale lock files that prevent PGlite from opening existing data
      const lockFile = path.join(tempDir, 'postmaster.pid');
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);

      console.log('v1 import: temp dir contents:', fs.readdirSync(tempDir));

      const { PGlite } = require('@electric-sql/pglite');
      pglite = new PGlite(tempDir);

      // Wait for WASM initialization to complete
      if (pglite.waitReady) await pglite.waitReady;
      else if (pglite.ready) await pglite.ready;
    } catch (err) {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
      return { success: false, error: `Cannot open v1.0 backup: ${(err as Error).message}` };
    }

    const db = (await import('../database/connection')).getDatabase();

    // Don't import 'migrations' — the new app manages its own
    const tables = [
      'currencies', 'users', 'customers', 'suppliers', 'product_categories',
      'products', 'invoices', 'invoice_items', 'expenses', 'donations',
      'app_settings', 'inventory_movements',
    ];

    let totalRows = 0;
    const errors: string[] = [];

    try {
      // Discover which tables actually exist in the PGlite backup
      let availableTables: string[] = [];
      try {
        const tableResult = await pglite.query(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
        );
        availableTables = tableResult.rows.map((r: any) => r.tablename);
        console.log('v1 import: tables found in backup:', availableTables);
      } catch (err) {
        console.error('v1 import: failed to list tables:', err);
        return { success: false, error: `Cannot read v1.0 backup tables: ${(err as Error).message}` };
      }

      // Clear existing data in reverse dependency order
      for (const table of [...tables].reverse()) {
        try {
          await db.exec(`DELETE FROM ${table}`);
        } catch { /* table might not exist yet */ }
      }

      // Import each table
      for (const table of tables) {
        if (!availableTables.includes(table)) {
          console.log(`v1 import: ${table} — not in backup (skipped)`);
          continue;
        }

        try {
          const result = await pglite.query(`SELECT * FROM ${table}`);
          const rows = result.rows as Record<string, any>[];
          if (!rows || rows.length === 0) {
            console.log(`v1 import: ${table} — 0 rows`);
            continue;
          }

          const columns = Object.keys(rows[0]);
          const placeholders = columns.map((_: string, i: number) => `$${i + 1}`).join(', ');
          const columnList = columns.map((c: string) => `"${c}"`).join(', ');
          const insertSql = `INSERT INTO ${table} (${columnList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

          await db.transact(async (tx) => {
            for (const row of rows) {
              const values = columns.map((col: string) => row[col]);
              await tx.prepare(insertSql).run(...values);
            }
          });

          totalRows += rows.length;
          console.log(`v1 import: ${table} — ${rows.length} rows`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`v1 import: ${table} failed:`, msg);
          errors.push(`${table}: ${msg}`);
        }
      }

      // Reset sequences
      for (const table of tables) {
        try {
          await db.exec(`
            SELECT setval(
              pg_get_serial_sequence('${table}', 'id'),
              COALESCE((SELECT MAX(id) FROM ${table}), 1)
            )
          `);
        } catch { /* no serial sequence */ }
      }

      if (totalRows === 0) {
        const detail = errors.length > 0 ? `\n${errors.join('\n')}` : '';
        return { success: false, error: `No data was imported from the backup.${detail}` };
      }

      return { success: true };
    } finally {
      try { await pglite.close(); } catch { /* ignore */ }
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  },
};
