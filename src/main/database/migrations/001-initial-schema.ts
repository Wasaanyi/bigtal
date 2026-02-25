import { getDatabase } from '../connection';

export async function migration001InitialSchema(): Promise<void> {
  const db = getDatabase();

  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'attendant')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Currencies table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS currencies (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `);

  // Customers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      currency_id INTEGER REFERENCES currencies(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Suppliers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Product Categories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Products table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('sell', 'buy', 'both')),
      category_id INTEGER REFERENCES product_categories(id),
      sell_price NUMERIC,
      buy_price NUMERIC,
      currency_id INTEGER NOT NULL REFERENCES currencies(id),
      stock_qty INTEGER DEFAULT 0,
      supplier_id INTEGER REFERENCES suppliers(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Invoices table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
      currency_id INTEGER NOT NULL REFERENCES currencies(id),
      total_amount NUMERIC NOT NULL DEFAULT 0,
      base_currency_id INTEGER REFERENCES currencies(id),
      exchange_rate NUMERIC,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by_user_id INTEGER NOT NULL REFERENCES users(id)
    )
  `);

  // Invoice Items table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price NUMERIC NOT NULL,
      line_total NUMERIC NOT NULL
    )
  `);

  // Expenses table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      supplier_id INTEGER REFERENCES suppliers(id),
      currency_id INTEGER NOT NULL REFERENCES currencies(id),
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      category TEXT,
      receipt_path TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Donations table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id SERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      amount NUMERIC,
      currency_code TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create indexes
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_expenses_currency ON expenses(currency_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
}
