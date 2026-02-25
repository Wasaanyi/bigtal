import { getDatabase } from '../connection';
import type { Customer, CreateCustomerDTO } from '../../../shared/types';

export const customerRepository = {
  async findAll(includeInactive = false): Promise<Customer[]> {
    const db = getDatabase();
    const whereClause = includeInactive ? '' : 'WHERE is_active = true';
    return await db
      .prepare(`SELECT * FROM customers ${whereClause} ORDER BY name`)
      .all() as unknown as Customer[];
  },

  async findById(id: number): Promise<Customer | null> {
    const db = getDatabase();
    const row = await db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer | undefined;
    return row || null;
  },

  async search(query: string): Promise<Customer[]> {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    return await db
      .prepare('SELECT * FROM customers WHERE name ILIKE ? OR phone ILIKE ? OR email ILIKE ? ORDER BY name LIMIT 20')
      .all(searchTerm, searchTerm, searchTerm) as unknown as Customer[];
  },

  async create(data: CreateCustomerDTO): Promise<Customer> {
    const db = getDatabase();
    const result = await db
      .prepare(
        'INSERT INTO customers (name, phone, email, address, currency_id) VALUES (?, ?, ?, ?, ?) RETURNING id'
      )
      .run(data.name, data.phone || null, data.email || null, data.address || null, data.currency_id || null);

    return (await this.findById(result.lastInsertRowid))!;
  },

  async update(id: number, data: Partial<CreateCustomerDTO>): Promise<Customer | null> {
    const db = getDatabase();
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      name: data.name ?? existing.name,
      phone: data.phone ?? existing.phone,
      email: data.email ?? existing.email,
      address: data.address ?? existing.address,
      currency_id: data.currency_id ?? existing.currency_id,
    };

    await db.prepare(
      'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, currency_id = ? WHERE id = ?'
    ).run(updated.name, updated.phone, updated.email, updated.address, updated.currency_id, id);

    return await this.findById(id);
  },

  async delete(id: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return result.changes > 0;
  },

  async hasRelatedRecords(id: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?')
      .get(id) as { count: number };
    return (result?.count || 0) > 0;
  },

  async disable(id: number): Promise<Customer | null> {
    const db = getDatabase();
    await db.prepare('UPDATE customers SET is_active = false WHERE id = ?').run(id);
    return await this.findById(id);
  },

  async enable(id: number): Promise<Customer | null> {
    const db = getDatabase();
    await db.prepare('UPDATE customers SET is_active = true WHERE id = ?').run(id);
    return await this.findById(id);
  },
};
