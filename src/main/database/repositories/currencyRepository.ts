import { getDatabase } from '../connection';
import type { Currency } from '../../../shared/types';

export const currencyRepository = {
  async findAll(): Promise<Currency[]> {
    const db = getDatabase();
    return await db.prepare('SELECT * FROM currencies ORDER BY code').all() as unknown as Currency[];
  },

  async findById(id: number): Promise<Currency | null> {
    const db = getDatabase();
    const row = await db.prepare('SELECT * FROM currencies WHERE id = ?').get(id) as Currency | undefined;
    return row || null;
  },

  async findByCode(code: string): Promise<Currency | null> {
    const db = getDatabase();
    const row = await db.prepare('SELECT * FROM currencies WHERE code = ?').get(code) as Currency | undefined;
    return row || null;
  },

  async getDefault(): Promise<Currency> {
    const db = getDatabase();
    // Return UGX as default
    const currency = await db.prepare("SELECT * FROM currencies WHERE code = 'UGX'").get() as Currency | undefined;
    if (!currency) {
      // Fallback to first currency
      return await db.prepare('SELECT * FROM currencies LIMIT 1').get() as unknown as Currency;
    }
    return currency;
  },
};
