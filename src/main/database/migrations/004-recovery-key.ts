import { getDatabase } from '../connection';

export async function migration004RecoveryKey(): Promise<void> {
  const db = getDatabase();
  const pglite = db.getPglite();

  await pglite.exec(`
    -- Create app_settings table for storing recovery key and other settings
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
