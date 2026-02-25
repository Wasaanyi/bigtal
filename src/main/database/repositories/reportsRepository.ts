import { getDatabase } from '../connection';
import type { SalesReportData, InventoryReportData, TradingPLData, BalanceSheetData, InventoryMovement } from '../../../shared/types';

export const reportsRepository = {
  async getSalesReport(startDate: string, endDate: string): Promise<SalesReportData> {
    const db = getDatabase();

    // Total revenue and transactions
    const totals = await db.prepare(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_transactions
      FROM invoices
      WHERE status = 'paid'
        AND DATE(created_at) >= ?
        AND DATE(created_at) <= ?
    `).get(startDate, endDate) as { total_revenue: number; total_transactions: number };

    const totalRevenue = Number(totals?.total_revenue) || 0;
    const totalTransactions = Number(totals?.total_transactions) || 0;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Top products
    const topProductsRaw = await db.prepare(`
      SELECT
        p.name,
        SUM(ii.quantity) as quantity,
        SUM(ii.line_total) as revenue
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN products p ON ii.product_id = p.id
      WHERE i.status = 'paid'
        AND DATE(i.created_at) >= ?
        AND DATE(i.created_at) <= ?
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT 10
    `).all(startDate, endDate) as Array<{ name: string; quantity: string; revenue: string }>;

    const topProducts = topProductsRaw.map(p => ({
      name: p.name,
      quantity: Number(p.quantity) || 0,
      revenue: Number(p.revenue) || 0,
    }));

    // Top customers
    const topCustomersRaw = await db.prepare(`
      SELECT
        c.name,
        COUNT(i.id) as transactions,
        SUM(i.total_amount) as revenue
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.status = 'paid'
        AND DATE(i.created_at) >= ?
        AND DATE(i.created_at) <= ?
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT 10
    `).all(startDate, endDate) as Array<{ name: string; transactions: string; revenue: string }>;

    const topCustomers = topCustomersRaw.map(c => ({
      name: c.name,
      transactions: Number(c.transactions) || 0,
      revenue: Number(c.revenue) || 0,
    }));

    // Daily sales
    const dailySalesRaw = await db.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as transactions
      FROM invoices
      WHERE status = 'paid'
        AND DATE(created_at) >= ?
        AND DATE(created_at) <= ?
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `).all(startDate, endDate) as Array<{ date: string; revenue: string; transactions: string }>;

    const dailySales = dailySalesRaw.map(d => ({
      date: d.date,
      revenue: Number(d.revenue) || 0,
      transactions: Number(d.transactions) || 0,
    }));

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      topProducts,
      topCustomers,
      dailySales,
    };
  },

  async getInventoryReport(): Promise<InventoryReportData> {
    const db = getDatabase();

    // Total inventory value
    const totalResult = await db.prepare(`
      SELECT
        COALESCE(SUM(stock_qty * COALESCE(buy_price, 0)), 0) as total_value,
        COUNT(*) as total_items
      FROM products
      WHERE is_active = true
    `).get() as { total_value: string; total_items: string };

    // Low stock items (threshold 10)
    const lowStockItemsRaw = await db.prepare(`
      SELECT id, name, stock_qty, COALESCE(buy_price, 0) as buy_price
      FROM products
      WHERE is_active = true AND stock_qty <= 10
      ORDER BY stock_qty ASC
      LIMIT 20
    `).all() as Array<{ id: number; name: string; stock_qty: string; buy_price: string }>;

    const lowStockItems = lowStockItemsRaw.map(item => ({
      id: item.id,
      name: item.name,
      stock_qty: Number(item.stock_qty) || 0,
      buy_price: Number(item.buy_price) || 0,
    }));

    // Stock by category
    const stockByCategoryRaw = await db.prepare(`
      SELECT
        COALESCE(pc.name, 'Uncategorized') as category,
        COUNT(p.id) as items,
        COALESCE(SUM(p.stock_qty * COALESCE(p.buy_price, 0)), 0) as value
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE p.is_active = true
      GROUP BY pc.name
      ORDER BY value DESC
    `).all() as Array<{ category: string; items: string; value: string }>;

    const stockByCategory = stockByCategoryRaw.map(cat => ({
      category: cat.category,
      items: Number(cat.items) || 0,
      value: Number(cat.value) || 0,
    }));

    // Recent movements
    const recentMovements = await db.prepare(`
      SELECT
        im.*,
        p.name as product_name,
        u.username as created_by_username
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.created_by = u.id
      ORDER BY im.created_at DESC
      LIMIT 20
    `).all() as unknown as InventoryMovement[];

    return {
      totalValue: Number(totalResult?.total_value) || 0,
      totalItems: Number(totalResult?.total_items) || 0,
      lowStockItems,
      stockByCategory,
      recentMovements,
    };
  },

  async getTradingPL(startDate: string, endDate: string): Promise<TradingPLData> {
    const db = getDatabase();

    // Revenue from paid invoices
    const revenueResult = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM invoices
      WHERE status = 'paid'
        AND DATE(created_at) >= ?
        AND DATE(created_at) <= ?
    `).get(startDate, endDate) as { revenue: string };

    const revenue = Number(revenueResult?.revenue) || 0;

    // Cost of Goods Sold (sum of buy_price * quantity for sold items)
    const cogsResult = await db.prepare(`
      SELECT COALESCE(SUM(ii.quantity * COALESCE(p.buy_price, 0)), 0) as cogs
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN products p ON ii.product_id = p.id
      WHERE i.status = 'paid'
        AND DATE(i.created_at) >= ?
        AND DATE(i.created_at) <= ?
    `).get(startDate, endDate) as { cogs: string };

    const costOfGoodsSold = Number(cogsResult?.cogs) || 0;

    // Expenses total and by category
    const expensesResult = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
    `).get(startDate, endDate) as { total: string };

    const expenses = Number(expensesResult?.total) || 0;

    const expensesByCategoryRaw = await db.prepare(`
      SELECT
        COALESCE(category, 'Other') as category,
        SUM(amount) as amount
      FROM expenses
      WHERE DATE(created_at) >= ?
        AND DATE(created_at) <= ?
      GROUP BY category
      ORDER BY amount DESC
    `).all(startDate, endDate) as Array<{ category: string; amount: string }>;

    const expensesByCategory = expensesByCategoryRaw.map(e => ({
      category: e.category,
      amount: Number(e.amount) || 0,
    }));

    // Calculations
    const grossProfit = revenue - costOfGoodsSold;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netProfit = grossProfit - expenses;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      costOfGoodsSold,
      grossProfit,
      grossMargin,
      expenses,
      expensesByCategory,
      netProfit,
      netMargin,
    };
  },

  async getBalanceSheet(asOfDate?: string): Promise<BalanceSheetData> {
    const db = getDatabase();
    const date = asOfDate || new Date().toISOString().slice(0, 10);

    // Inventory value (current stock * buy price)
    const inventoryResult = await db.prepare(`
      SELECT COALESCE(SUM(stock_qty * COALESCE(buy_price, 0)), 0) as value
      FROM products
      WHERE is_active = true
    `).get() as { value: string };

    const inventory = Number(inventoryResult?.value) || 0;

    // Receivables (unpaid invoices created on or before date)
    const receivablesResult = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as value
      FROM invoices
      WHERE status IN ('draft', 'sent', 'overdue')
        AND DATE(created_at) <= ?
    `).get(date) as { value: string };

    const receivables = Number(receivablesResult?.value) || 0;

    // Cash (paid invoices up to date - expenses up to date)
    const cashInResult = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as value
      FROM invoices
      WHERE status = 'paid'
        AND DATE(created_at) <= ?
    `).get(date) as { value: string };

    const cashOutResult = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as value
      FROM expenses
      WHERE DATE(created_at) <= ?
    `).get(date) as { value: string };

    const cashIn = Number(cashInResult?.value) || 0;
    const cashOut = Number(cashOutResult?.value) || 0;
    const cash = cashIn - cashOut;

    const totalAssets = inventory + receivables + cash;

    return {
      assets: {
        inventory,
        receivables,
        cash,
        total: totalAssets,
      },
      equity: totalAssets, // In a simple balance sheet, equity = assets (no liabilities tracked)
      asOfDate: date,
    };
  },
};
