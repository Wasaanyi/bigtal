import { getDatabase } from '../connection';
import bcrypt from 'bcryptjs';

export async function migration002SeedData(): Promise<void> {
  const db = getDatabase();

  // Seed currencies
  const currencies = [
    { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
    { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  ];

  for (const currency of currencies) {
    await db.prepare(
      'INSERT INTO currencies (code, symbol, name) VALUES (?, ?, ?) ON CONFLICT (code) DO NOTHING'
    ).run(currency.code, currency.symbol, currency.name);
  }

  // Seed default users
  const users = [
    { username: 'admin', password: 'admin', role: 'admin' },
    { username: 'attendant', password: '1234', role: 'attendant' },
  ];

  for (const user of users) {
    const passwordHash = bcrypt.hashSync(user.password, 10);
    await db.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON CONFLICT (username) DO NOTHING'
    ).run(user.username, passwordHash, user.role);
  }

  // Seed default product categories
  const categories = [
    { name: 'Electronics', description: 'Electronic devices and accessories' },
    { name: 'Clothing', description: 'Apparel and fashion items' },
    { name: 'Food & Beverages', description: 'Food items and drinks' },
    { name: 'Home & Garden', description: 'Home and garden products' },
    { name: 'Health & Beauty', description: 'Health and beauty products' },
    { name: 'Other', description: 'Miscellaneous items' },
  ];

  for (const category of categories) {
    await db.prepare(
      'INSERT INTO product_categories (name, description) VALUES (?, ?) ON CONFLICT (name) DO NOTHING'
    ).run(category.name, category.description);
  }
}
