import { getDatabase } from '../connection';
import { migration001InitialSchema } from './001-initial-schema';
import { migration002SeedData } from './002-seed-data';
import { migration003SoftDelete } from './003-soft-delete';
import { migration004RecoveryKey } from './004-recovery-key';
import { migration005EmailConfig } from './005-email-config';
import { migration006InventoryUserEmail } from './006-inventory-user-email';

interface Migration {
  name: string;
  up: () => Promise<void>;
}

const migrations: Migration[] = [
  { name: '001-initial-schema', up: migration001InitialSchema },
  { name: '002-seed-data', up: migration002SeedData },
  { name: '003-soft-delete', up: migration003SoftDelete },
  { name: '004-recovery-key', up: migration004RecoveryKey },
  { name: '005-email-config', up: migration005EmailConfig },
  { name: '006-inventory-user-email', up: migration006InventoryUserEmail },
];

export async function runMigrations(): Promise<void> {
  const db = getDatabase();

  // Get applied migrations
  const appliedMigrations = await db
    .prepare('SELECT name FROM migrations')
    .all() as { name: string }[];
  let appliedNames = new Set(appliedMigrations.map((m) => m.name));

  // Sanity check: if migrations claim "applied" but core tables don't exist,
  // clear stale records so migrations re-run (fixes broken PGlite migration order)
  if (appliedNames.size > 0) {
    try {
      await db.prepare("SELECT 1 FROM users LIMIT 1").all();
    } catch {
      console.warn('Migrations: stale records detected (tables missing). Clearing migration history to re-run.');
      await db.exec('DELETE FROM migrations');
      appliedNames = new Set();
    }
  }

  // Run pending migrations
  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      console.log(`Running migration: ${migration.name}`);

      try {
        await migration.up();
        await db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
        console.log(`Migration ${migration.name} applied successfully`);
      } catch (error) {
        console.error(`Migration ${migration.name} failed:`, error);
        throw error;
      }
    }
  }

  console.log('All migrations applied');
}

export async function getMigrationStatus(): Promise<{ name: string; applied: boolean }[]> {
  const db = getDatabase();
  const appliedMigrations = await db
    .prepare('SELECT name FROM migrations')
    .all() as { name: string }[];
  const appliedNames = new Set(appliedMigrations.map((m) => m.name));

  return migrations.map((m) => ({
    name: m.name,
    applied: appliedNames.has(m.name),
  }));
}
