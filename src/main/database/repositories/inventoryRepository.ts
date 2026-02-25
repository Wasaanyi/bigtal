import { getDatabase } from '../connection';
import type { InventoryMovement, CreateInventoryDTO } from '../../../shared/types';

export const inventoryRepository = {
  async create(data: CreateInventoryDTO, userId: number): Promise<InventoryMovement> {
    const db = getDatabase();
    const pglite = db.getPglite();

    await pglite.exec('BEGIN');

    try {
      // Create the movement record
      const result = await db.prepare(`
        INSERT INTO inventory_movements (product_id, quantity, movement_type, reference_type, reference_id, notes, unit_cost, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
      `).run(
        data.product_id,
        data.quantity,
        data.movement_type,
        data.reference_type || null,
        data.reference_id || null,
        data.notes || null,
        data.unit_cost || null,
        userId
      );

      // Update product stock quantity
      await db.prepare(`
        UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?
      `).run(data.quantity, data.product_id);

      await pglite.exec('COMMIT');

      return (await this.findById(result.lastInsertRowid))!;
    } catch (error) {
      await pglite.exec('ROLLBACK');
      throw error;
    }
  },

  async findById(id: number): Promise<InventoryMovement | null> {
    const db = getDatabase();
    const row = await db.prepare(`
      SELECT
        im.*,
        p.name as product_name,
        u.username as created_by_username
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.created_by = u.id
      WHERE im.id = ?
    `).get(id) as InventoryMovement | undefined;
    return row || null;
  },

  async findAll(limit?: number): Promise<InventoryMovement[]> {
    const db = getDatabase();
    const limitClause = limit ? `LIMIT ${limit}` : 'LIMIT 100';

    return await db.prepare(`
      SELECT
        im.*,
        p.name as product_name,
        u.username as created_by_username
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.created_by = u.id
      ORDER BY im.created_at DESC
      ${limitClause}
    `).all() as unknown as InventoryMovement[];
  },

  async findByProduct(productId: number): Promise<InventoryMovement[]> {
    const db = getDatabase();
    return await db.prepare(`
      SELECT
        im.*,
        p.name as product_name,
        u.username as created_by_username
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.created_by = u.id
      WHERE im.product_id = ?
      ORDER BY im.created_at DESC
    `).all(productId) as unknown as InventoryMovement[];
  },

  async getStockValue(): Promise<number> {
    const db = getDatabase();
    const result = await db.prepare(`
      SELECT COALESCE(SUM(stock_qty * COALESCE(buy_price, 0)), 0) as total
      FROM products
      WHERE is_active = true
    `).get() as { total: number };
    return result?.total || 0;
  },

  async getLowStockItems(threshold: number = 10): Promise<Array<{ id: number; name: string; stock_qty: number; buy_price: number }>> {
    const db = getDatabase();
    return await db.prepare(`
      SELECT id, name, stock_qty, COALESCE(buy_price, 0) as buy_price
      FROM products
      WHERE is_active = true AND stock_qty <= ?
      ORDER BY stock_qty ASC
    `).all(threshold) as Array<{ id: number; name: string; stock_qty: number; buy_price: number }>;
  },

  async getStockByCategory(): Promise<Array<{ category: string; items: number; value: number }>> {
    const db = getDatabase();
    return await db.prepare(`
      SELECT
        COALESCE(pc.name, 'Uncategorized') as category,
        COUNT(p.id) as items,
        COALESCE(SUM(p.stock_qty * COALESCE(p.buy_price, 0)), 0) as value
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.is_active = true
      GROUP BY pc.name
      ORDER BY value DESC
    `).all() as Array<{ category: string; items: number; value: number }>;
  },
};
