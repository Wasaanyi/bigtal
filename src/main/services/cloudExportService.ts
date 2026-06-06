import { app, dialog } from 'electron';
import * as fs from 'fs';
import { getDatabase } from '../database/connection';
import { businessService } from './businessService';

/**
 * Exports the full local database as a schema-v1 "cloud bundle" JSON file.
 *
 * The structure is consumed verbatim by the Bigtal Cloud Import Wizard
 * (bigtal-online: functions/api/import/validate + commit). Rules enforced by
 * that importer and mirrored here:
 *  - schema_version must be 1
 *  - money is emitted as decimal strings (NUMERIC); the cloud multiplies x100
 *  - source ids are integers; the cloud remaps them to ULIDs
 *  - local users are NOT transferred as accounts — they are embedded as
 *    metadata under business_info.local_users so the cloud owner can re-invite
 *    them. All imported rows attribute to the authenticated cloud owner.
 */

const SCHEMA_VERSION = 1;

/** Coerce a NUMERIC/text value to a decimal string, preserving null. */
function money(value: unknown): string | null {
  return value == null ? null : String(value);
}

/** Coerce a TIMESTAMPTZ (pg returns a Date) to an ISO string, preserving null. */
function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/** Coerce a BOOLEAN to a JS boolean; treat null as active (column default). */
function active(value: unknown): boolean {
  return value == null ? true : Boolean(value);
}

async function buildBundle(): Promise<Record<string, unknown>> {
  const db = getDatabase();

  const currencies = await db.prepare('SELECT id, code FROM currencies ORDER BY id').all();

  const categories = await db
    .prepare('SELECT id, name, description FROM product_categories ORDER BY id')
    .all();

  const suppliers = await db
    .prepare('SELECT id, name, phone, email, is_active FROM suppliers ORDER BY id')
    .all();

  const customers = await db
    .prepare(
      'SELECT id, name, phone, email, address, currency_id, is_active FROM customers ORDER BY id',
    )
    .all();

  const products = await db
    .prepare(
      `SELECT id, name, type, category_id, sell_price, buy_price, currency_id,
              stock_qty, supplier_id, is_active
       FROM products ORDER BY id`,
    )
    .all();

  const invoices = await db
    .prepare(
      `SELECT id, invoice_number, customer_id, status, currency_id, total_amount,
              base_currency_id, exchange_rate, due_date, created_at
       FROM invoices ORDER BY id`,
    )
    .all();

  const invoiceItems = await db
    .prepare(
      'SELECT id, invoice_id, product_id, quantity, unit_price, line_total FROM invoice_items ORDER BY id',
    )
    .all();

  const expenses = await db
    .prepare(
      `SELECT id, supplier_id, currency_id, description, amount, category, created_at
       FROM expenses ORDER BY id`,
    )
    .all();

  const movements = await db
    .prepare(
      `SELECT id, product_id, quantity, movement_type, reference_type, reference_id,
              notes, unit_cost, created_at
       FROM inventory_movements ORDER BY id`,
    )
    .all();

  // Local users → metadata only (the cloud creates no accounts from these).
  const localUsers = await db
    .prepare('SELECT username, role, email FROM users ORDER BY id')
    .all();

  const businessInfo = (await businessService.getInfo()) ?? {};

  return {
    bigtal_export: {
      schema_version: SCHEMA_VERSION,
      app_version: app.getVersion(),
      exported_at: new Date().toISOString(),
      business_info: {
        ...businessInfo,
        local_users: localUsers.map((u) => ({
          username: u.username,
          role: u.role,
          email: u.email ?? null,
        })),
      },
      data: {
        currencies: currencies.map((c) => ({ id: c.id, code: c.code })),
        product_categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? null,
        })),
        suppliers: suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone ?? null,
          email: s.email ?? null,
          is_active: active(s.is_active),
        })),
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? null,
          email: c.email ?? null,
          address: c.address ?? null,
          currency_id: c.currency_id ?? null,
          is_active: active(c.is_active),
        })),
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          category_id: p.category_id ?? null,
          sell_price: money(p.sell_price),
          buy_price: money(p.buy_price),
          currency_id: p.currency_id,
          stock_qty: p.stock_qty ?? 0,
          supplier_id: p.supplier_id ?? null,
          is_active: active(p.is_active),
        })),
        invoices: invoices.map((i) => ({
          id: i.id,
          invoice_number: i.invoice_number,
          customer_id: i.customer_id,
          status: i.status,
          currency_id: i.currency_id,
          total_amount: money(i.total_amount),
          base_currency_id: i.base_currency_id ?? null,
          exchange_rate: i.exchange_rate == null ? null : Number(i.exchange_rate),
          due_date: iso(i.due_date),
          created_at: iso(i.created_at),
        })),
        invoice_items: invoiceItems.map((it) => ({
          id: it.id,
          invoice_id: it.invoice_id,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: money(it.unit_price),
          line_total: money(it.line_total),
        })),
        expenses: expenses.map((e) => ({
          id: e.id,
          supplier_id: e.supplier_id ?? null,
          currency_id: e.currency_id,
          description: e.description,
          amount: money(e.amount),
          category: e.category ?? null,
          created_at: iso(e.created_at),
        })),
        inventory_movements: movements.map((m) => ({
          id: m.id,
          product_id: m.product_id,
          quantity: m.quantity,
          movement_type: m.movement_type,
          reference_type: m.reference_type ?? null,
          reference_id: m.reference_id ?? null,
          notes: m.notes ?? null,
          unit_cost: money(m.unit_cost),
          created_at: iso(m.created_at),
        })),
      },
    },
  };
}

export const cloudExportService = {
  /**
   * Builds the cloud bundle and writes it to a user-chosen .json file.
   */
  async exportForCloud(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const defaultFileName = `bigtal-cloud-export-${new Date().toISOString().slice(0, 10)}.json`;

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export for Cloud',
        defaultPath: defaultFileName,
        filters: [
          { name: 'Bigtal Cloud Export', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      const finalPath = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
      const bundle = await buildBundle();
      fs.writeFileSync(finalPath, JSON.stringify(bundle, null, 2), 'utf-8');

      return { success: true, filePath: finalPath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};
