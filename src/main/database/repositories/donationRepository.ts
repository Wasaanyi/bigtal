import { getDatabase } from '../connection';
import type { Donation } from '../../../shared/types';

export const donationRepository = {
  async log(deviceId: string, amount?: number, currencyCode?: string): Promise<Donation> {
    const db = getDatabase();
    const result = await db
      .prepare('INSERT INTO donations (device_id, amount, currency_code) VALUES (?, ?, ?) RETURNING id')
      .run(deviceId, amount || null, currencyCode || null);

    return await db
      .prepare('SELECT * FROM donations WHERE id = ?')
      .get(result.lastInsertRowid) as unknown as Donation;
  },

  async findAll(): Promise<Donation[]> {
    const db = getDatabase();
    return await db.prepare('SELECT * FROM donations ORDER BY created_at DESC').all() as unknown as Donation[];
  },

  async findByDeviceId(deviceId: string): Promise<Donation[]> {
    const db = getDatabase();
    return await db
      .prepare('SELECT * FROM donations WHERE device_id = ? ORDER BY created_at DESC')
      .all(deviceId) as unknown as Donation[];
  },
};
