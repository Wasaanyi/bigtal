import { getDatabase } from '../connection';
import type { Supplier, CreateSupplierDTO } from '../../../shared/types';

export const supplierRepository = {
  async findAll(includeInactive = false): Promise<Supplier[]> {
    const db = getDatabase();
    const whereClause = includeInactive ? '' : 'WHERE is_active = true';
    return await db.prepare(`SELECT * FROM suppliers ${whereClause} ORDER BY name`).all() as unknown as Supplier[];
  },

  async findById(id: number): Promise<Supplier | null> {
    const db = getDatabase();
    const row = await db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier | undefined;
    return row || null;
  },

  async create(data: CreateSupplierDTO): Promise<Supplier> {
    const db = getDatabase();
    const result = await db
      .prepare('INSERT INTO suppliers (name, phone, email) VALUES (?, ?, ?) RETURNING id')
      .run(data.name, data.phone || null, data.email || null);

    return (await this.findById(result.lastInsertRowid))!;
  },

  async update(id: number, data: Partial<CreateSupplierDTO>): Promise<Supplier | null> {
    const db = getDatabase();
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      name: data.name ?? existing.name,
      phone: data.phone ?? existing.phone,
      email: data.email ?? existing.email,
    };

    await db.prepare('UPDATE suppliers SET name = ?, phone = ?, email = ? WHERE id = ?').run(
      updated.name,
      updated.phone,
      updated.email,
      id
    );

    return await this.findById(id);
  },

  async delete(id: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    return result.changes > 0;
  },

  async hasRelatedRecords(id: number): Promise<boolean> {
    const db = getDatabase();
    const productsCount = await db
      .prepare('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?')
      .get(id) as { count: number };
    const expensesCount = await db
      .prepare('SELECT COUNT(*) as count FROM expenses WHERE supplier_id = ?')
      .get(id) as { count: number };
    return (productsCount?.count || 0) > 0 || (expensesCount?.count || 0) > 0;
  },

  async disable(id: number): Promise<Supplier | null> {
    const db = getDatabase();
    await db.prepare('UPDATE suppliers SET is_active = false WHERE id = ?').run(id);
    return await this.findById(id);
  },

  async enable(id: number): Promise<Supplier | null> {
    const db = getDatabase();
    await db.prepare('UPDATE suppliers SET is_active = true WHERE id = ?').run(id);
    return await this.findById(id);
  },
};
