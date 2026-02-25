import { getDatabase } from '../connection';
import type { Product, CreateProductDTO } from '../../../shared/types';

export const productRepository = {
  async findAll(includeInactive = false): Promise<Product[]> {
    const db = getDatabase();
    const whereClause = includeInactive ? '' : 'WHERE p.is_active = true';
    return await db
      .prepare(`
        SELECT
          p.*,
          pc.name as category_name,
          c.code as currency_code,
          s.name as supplier_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN currencies c ON p.currency_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        ${whereClause}
        ORDER BY p.name
      `)
      .all() as unknown as Product[];
  },

  async findById(id: number): Promise<Product | null> {
    const db = getDatabase();
    const row = await db
      .prepare(`
        SELECT
          p.*,
          pc.name as category_name,
          c.code as currency_code,
          s.name as supplier_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN currencies c ON p.currency_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = ?
      `)
      .get(id) as Product | undefined;
    return row || null;
  },

  async search(query: string): Promise<Product[]> {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    return await db
      .prepare(`
        SELECT
          p.*,
          pc.name as category_name,
          c.code as currency_code,
          s.name as supplier_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN currencies c ON p.currency_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.name ILIKE ?
        ORDER BY p.name
        LIMIT 20
      `)
      .all(searchTerm) as unknown as Product[];
  },

  async findByCategory(categoryId: number): Promise<Product[]> {
    const db = getDatabase();
    return await db
      .prepare(`
        SELECT
          p.*,
          pc.name as category_name,
          c.code as currency_code,
          s.name as supplier_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN currencies c ON p.currency_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.category_id = ?
        ORDER BY p.name
      `)
      .all(categoryId) as unknown as Product[];
  },

  async findSellableProducts(): Promise<Product[]> {
    const db = getDatabase();
    return await db
      .prepare(`
        SELECT
          p.*,
          pc.name as category_name,
          c.code as currency_code,
          s.name as supplier_name
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN currencies c ON p.currency_id = c.id
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.type IN ('sell', 'both')
        ORDER BY p.name
      `)
      .all() as unknown as Product[];
  },

  async create(data: CreateProductDTO): Promise<Product> {
    const db = getDatabase();
    const result = await db
      .prepare(`
        INSERT INTO products (name, type, category_id, sell_price, buy_price, currency_id, stock_qty, supplier_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
      `)
      .run(
        data.name,
        data.type,
        data.category_id || null,
        data.sell_price || null,
        data.buy_price || null,
        data.currency_id,
        data.stock_qty || 0,
        data.supplier_id || null
      );

    return (await this.findById(result.lastInsertRowid))!;
  },

  async update(id: number, data: Partial<CreateProductDTO>): Promise<Product | null> {
    const db = getDatabase();
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      category_id: data.category_id ?? existing.category_id,
      sell_price: data.sell_price ?? existing.sell_price,
      buy_price: data.buy_price ?? existing.buy_price,
      currency_id: data.currency_id ?? existing.currency_id,
      stock_qty: data.stock_qty ?? existing.stock_qty,
      supplier_id: data.supplier_id ?? existing.supplier_id,
    };

    await db.prepare(`
      UPDATE products
      SET name = ?, type = ?, category_id = ?, sell_price = ?, buy_price = ?,
          currency_id = ?, stock_qty = ?, supplier_id = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.type,
      updated.category_id,
      updated.sell_price,
      updated.buy_price,
      updated.currency_id,
      updated.stock_qty,
      updated.supplier_id,
      id
    );

    return await this.findById(id);
  },

  async updateStock(id: number, quantity: number): Promise<Product | null> {
    const db = getDatabase();
    await db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?').run(quantity, id);
    return await this.findById(id);
  },

  async delete(id: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
  },

  async hasRelatedRecords(id: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db
      .prepare('SELECT COUNT(*) as count FROM invoice_items WHERE product_id = ?')
      .get(id) as { count: number };
    return (result?.count || 0) > 0;
  },

  async disable(id: number): Promise<Product | null> {
    const db = getDatabase();
    await db.prepare('UPDATE products SET is_active = false WHERE id = ?').run(id);
    return await this.findById(id);
  },

  async enable(id: number): Promise<Product | null> {
    const db = getDatabase();
    await db.prepare('UPDATE products SET is_active = true WHERE id = ?').run(id);
    return await this.findById(id);
  },
};
