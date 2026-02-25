import { getDatabase } from '../connection';

export async function migration006InventoryUserEmail(): Promise<void> {
  const db = getDatabase();

  // Create inventory movements table for audit trail
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'adjustment', 'return', 'sale', 'initial')),
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      unit_cost NUMERIC,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).run();

  // Create indexes for inventory queries
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory_movements(created_at)
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory_movements(movement_type)
  `).run();

  // Add email column to users table
  await db.prepare(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT
  `).run();
}
