import { getDatabase } from '../connection';
import type { Expense, CreateExpenseDTO } from '../../../shared/types';

export const expenseRepository = {
  async findAll(): Promise<Expense[]> {
    const db = getDatabase();
    return await db
      .prepare(`
        SELECT
          e.*,
          s.name as supplier_name,
          c.code as currency_code,
          c.symbol as currency_symbol
        FROM expenses e
        LEFT JOIN suppliers s ON e.supplier_id = s.id
        LEFT JOIN currencies c ON e.currency_id = c.id
        ORDER BY e.created_at DESC
      `)
      .all() as unknown as Expense[];
  },

  async findById(id: number): Promise<Expense | null> {
    const db = getDatabase();
    const row = await db
      .prepare(`
        SELECT
          e.*,
          s.name as supplier_name,
          c.code as currency_code,
          c.symbol as currency_symbol
        FROM expenses e
        LEFT JOIN suppliers s ON e.supplier_id = s.id
        LEFT JOIN currencies c ON e.currency_id = c.id
        WHERE e.id = ?
      `)
      .get(id) as Expense | undefined;
    return row || null;
  },

  async create(data: CreateExpenseDTO): Promise<Expense> {
    const db = getDatabase();
    const result = await db
      .prepare(`
        INSERT INTO expenses (supplier_id, currency_id, description, amount, category, receipt_path)
        VALUES (?, ?, ?, ?, ?, ?) RETURNING id
      `)
      .run(
        data.supplier_id || null,
        data.currency_id,
        data.description,
        data.amount,
        data.category || null,
        data.receipt_path || null
      );

    return (await this.findById(result.lastInsertRowid))!;
  },

  async update(id: number, data: Partial<CreateExpenseDTO>): Promise<Expense | null> {
    const db = getDatabase();
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      supplier_id: data.supplier_id ?? existing.supplier_id,
      currency_id: data.currency_id ?? existing.currency_id,
      description: data.description ?? existing.description,
      amount: data.amount ?? existing.amount,
      category: data.category ?? existing.category,
      receipt_path: data.receipt_path ?? existing.receipt_path,
    };

    await db.prepare(`
      UPDATE expenses
      SET supplier_id = ?, currency_id = ?, description = ?, amount = ?, category = ?, receipt_path = ?
      WHERE id = ?
    `).run(
      updated.supplier_id,
      updated.currency_id,
      updated.description,
      updated.amount,
      updated.category,
      updated.receipt_path,
      id
    );

    return await this.findById(id);
  },

  async delete(id: number): Promise<boolean> {
    const db = getDatabase();
    const result = await db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return result.changes > 0;
  },

  async getTodayExpenses(): Promise<number> {
    const db = getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    const result = await db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE DATE(created_at) = ?
      `)
      .get(today) as { total: number };

    return result?.total || 0;
  },

  async getEarliestYear(): Promise<number | null> {
    const db = getDatabase();
    const result = await db
      .prepare(`SELECT MIN(EXTRACT(YEAR FROM created_at)) as year FROM expenses`)
      .get() as { year: number | null };
    return result?.year ?? null;
  },

  async getYearlyExpenses(year?: number): Promise<number> {
    const db = getDatabase();
    const targetYear = year ?? new Date().getFullYear();

    const result = await db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE EXTRACT(YEAR FROM created_at) = ?
      `)
      .get(targetYear) as { total: number };

    return result?.total || 0;
  },
};
