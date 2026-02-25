import { getDatabase } from '../connection';

export async function migration003SoftDelete(): Promise<void> {
  const db = getDatabase();
  const pglite = db.getPglite();

  await pglite.exec(`
    -- Add is_active column to customers
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

    -- Add is_active column to suppliers
    ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

    -- Add is_active column to products
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  `);
}
