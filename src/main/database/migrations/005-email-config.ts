import { getDatabase } from '../connection';

export async function migration005EmailConfig(): Promise<void> {
  const db = getDatabase();

  // Add email configuration columns to app_settings
  // The app_settings table was created in migration 004
  // We'll store SMTP settings as JSON in the 'email_config' key

  // Ensure the app_settings table exists (idempotent)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log('Email configuration migration complete');
}
