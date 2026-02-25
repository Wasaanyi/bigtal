import { getDatabase } from '../connection';
import type { Invoice, InvoiceItem, InvoiceWithItems, CreateInvoiceDTO, InvoiceStatus, UserRole } from '../../../shared/types';

export const invoiceRepository = {
  async generateInvoiceNumber(): Promise<string> {
    const db = getDatabase();
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of invoices for today
    const count = await db
      .prepare("SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?")
      .get(`INV-${datePrefix}%`) as { count: number };

    const sequence = String((count?.count || 0) + 1).padStart(4, '0');
    return `INV-${datePrefix}-${sequence}`;
  },

  async findAll(userRole: UserRole): Promise<Invoice[]> {
    const db = getDatabase();

    // Attendants don't see paid invoices
    const statusFilter = userRole === 'attendant' ? "AND i.status != 'paid'" : '';

    return await db
      .prepare(`
        SELECT
          i.*,
          c.name as customer_name,
          cur.code as currency_code,
          cur.symbol as currency_symbol
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN currencies cur ON i.currency_id = cur.id
        WHERE 1=1 ${statusFilter}
        ORDER BY i.created_at DESC
      `)
      .all() as unknown as Invoice[];
  },

  async findById(id: number): Promise<InvoiceWithItems | null> {
    const db = getDatabase();

    const invoice = await db
      .prepare(`
        SELECT
          i.*,
          c.name as customer_name,
          cur.code as currency_code,
          cur.symbol as currency_symbol
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN currencies cur ON i.currency_id = cur.id
        WHERE i.id = ?
      `)
      .get(id) as Invoice | undefined;

    if (!invoice) return null;

    const items = await db
      .prepare(`
        SELECT
          ii.*,
          p.name as product_name
        FROM invoice_items ii
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = ?
      `)
      .all(id) as unknown as InvoiceItem[];

    return { ...invoice, items };
  },

  async findByStatus(status: InvoiceStatus, userRole: UserRole): Promise<Invoice[]> {
    const db = getDatabase();

    // Attendants can't see paid invoices
    if (userRole === 'attendant' && status === 'paid') {
      return [];
    }

    return await db
      .prepare(`
        SELECT
          i.*,
          c.name as customer_name,
          cur.code as currency_code,
          cur.symbol as currency_symbol
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN currencies cur ON i.currency_id = cur.id
        WHERE i.status = ?
        ORDER BY i.created_at DESC
      `)
      .all(status) as unknown as Invoice[];
  },

  async create(data: CreateInvoiceDTO, userId: number): Promise<InvoiceWithItems> {
    const db = getDatabase();
    const pglite = db.getPglite();

    // Calculate total
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const invoiceNumber = await this.generateInvoiceNumber();

    // Use PGlite transaction directly for async operations
    await pglite.exec('BEGIN');

    try {
      const invoiceResult = await db.prepare(`
        INSERT INTO invoices (invoice_number, customer_id, currency_id, total_amount, due_date, created_by_user_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'draft', COALESCE(?, NOW())) RETURNING id
      `).run(invoiceNumber, data.customer_id, data.currency_id, total, data.due_date || null, userId, data.created_at || null);

      const invoiceId = invoiceResult.lastInsertRowid;

      for (const item of data.items) {
        const lineTotal = item.quantity * item.unit_price;
        await db.prepare(`
          INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, line_total)
          VALUES (?, ?, ?, ?, ?)
        `).run(invoiceId, item.product_id, item.quantity, item.unit_price, lineTotal);

        // Decrease stock
        await db.prepare(`
          UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?
        `).run(item.quantity, item.product_id);
      }

      await pglite.exec('COMMIT');
      return (await this.findById(invoiceId))!;
    } catch (error) {
      await pglite.exec('ROLLBACK');
      throw error;
    }
  },

  async updateStatus(id: number, status: InvoiceStatus): Promise<Invoice | null> {
    const db = getDatabase();
    await db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, id);

    const invoice = await db
      .prepare(`
        SELECT
          i.*,
          c.name as customer_name,
          cur.code as currency_code,
          cur.symbol as currency_symbol
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN currencies cur ON i.currency_id = cur.id
        WHERE i.id = ?
      `)
      .get(id) as Invoice | undefined;

    return invoice || null;
  },

  async delete(id: number): Promise<boolean> {
    const db = getDatabase();
    const pglite = db.getPglite();

    // First get invoice items to restore stock
    const items = await db
      .prepare('SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?')
      .all(id) as { product_id: number; quantity: number }[];

    await pglite.exec('BEGIN');

    try {
      for (const item of items) {
        await db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?').run(
          item.quantity,
          item.product_id
        );
      }

      // Delete invoice (items will cascade)
      await db.prepare('DELETE FROM invoices WHERE id = ?').run(id);

      await pglite.exec('COMMIT');
      return true;
    } catch (error) {
      await pglite.exec('ROLLBACK');
      throw error;
    }
  },

  async getTodayIncome(): Promise<number> {
    const db = getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    const result = await db
      .prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE status = 'paid' AND DATE(created_at) = ?
      `)
      .get(today) as { total: number };

    return result?.total || 0;
  },

  async getYearlyIncome(year?: number): Promise<number> {
    const db = getDatabase();
    const targetYear = year ?? new Date().getFullYear();

    const result = await db
      .prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE status = 'paid' AND EXTRACT(YEAR FROM created_at) = ?
      `)
      .get(targetYear) as { total: number };

    return result?.total || 0;
  },

  async getEarliestYear(): Promise<number | null> {
    const db = getDatabase();
    const result = await db
      .prepare(`SELECT MIN(EXTRACT(YEAR FROM created_at)) as year FROM invoices`)
      .get() as { year: number | null };
    return result?.year ?? null;
  },

  async getOverdueInvoices(): Promise<{ count: number; total: number }> {
    const db = getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    const result = await db
      .prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
        FROM invoices
        WHERE status IN ('draft', 'sent') AND due_date < ?
      `)
      .get(today) as { count: number; total: number };

    return result || { count: 0, total: 0 };
  },

  async getTopProducts(limit: number = 5): Promise<{ name: string; quantity: number; value: number }[]> {
    const db = getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    return await db
      .prepare(`
        SELECT
          p.name,
          SUM(ii.quantity) as quantity,
          SUM(ii.line_total) as value
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN products p ON ii.product_id = p.id
        WHERE DATE(i.created_at) = ?
        GROUP BY p.id, p.name
        ORDER BY quantity DESC
        LIMIT ?
      `)
      .all(today, limit) as { name: string; quantity: number; value: number }[];
  },
};
