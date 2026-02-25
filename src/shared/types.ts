// User types
export type UserRole = 'admin' | 'attendant';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  email?: string;
  created_at: string;
}

export interface UserSession {
  user: User;
  token: string;
}

// Currency types
export interface Currency {
  id: number;
  code: string;
  symbol: string;
  name: string;
}

// Customer types
export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  currency_id?: number;
  created_at: string;
}

// Supplier types
export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  created_at: string;
}

// Product Category types
export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

// Product types
export type ProductType = 'sell' | 'buy' | 'both';

export interface Product {
  id: number;
  name: string;
  type: ProductType;
  category_id?: number;
  category_name?: string;
  sell_price?: number;
  buy_price?: number;
  currency_id: number;
  currency_code?: string;
  stock_qty: number;
  supplier_id?: number;
  supplier_name?: string;
  created_at: string;
}

// Invoice types
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name?: string;
  status: InvoiceStatus;
  currency_id: number;
  currency_code?: string;
  currency_symbol?: string;
  total_amount: number;
  base_currency_id?: number;
  exchange_rate?: number;
  due_date?: string;
  created_at: string;
  created_by_user_id: number;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

// Expense types
export interface Expense {
  id: number;
  supplier_id?: number;
  supplier_name?: string;
  currency_id: number;
  currency_code?: string;
  currency_symbol?: string;
  description: string;
  amount: number;
  category?: string;
  receipt_path?: string;
  created_at: string;
}

// Donation types
export interface Donation {
  id: number;
  device_id: string;
  amount?: number;
  currency_code?: string;
  created_at: string;
}

// Dashboard types
export interface DashboardStats {
  todayIncome: number;
  todayExpenses: number;
  cashBalance: number;
  yearlyIncome: number;
  yearlyExpenses: number;
  yearlyProfit: number;
  earliestYear: number;
  overdueInvoices: {
    count: number;
    total: number;
  };
  topProducts: Array<{
    name: string;
    quantity: number;
    value: number;
  }>;
  defaultCurrency: Currency;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Create/Update DTOs
export interface CreateCustomerDTO {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  currency_id?: number;
}

export interface CreateSupplierDTO {
  name: string;
  phone?: string;
  email?: string;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

export interface CreateProductDTO {
  name: string;
  type: ProductType;
  category_id?: number;
  sell_price?: number;
  buy_price?: number;
  currency_id: number;
  stock_qty?: number;
  supplier_id?: number;
}

export interface CreateInvoiceDTO {
  customer_id: number;
  currency_id: number;
  due_date?: string;
  created_at?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
  }>;
}

export interface CreateExpenseDTO {
  supplier_id?: number;
  currency_id: number;
  description: string;
  amount: number;
  category?: string;
  receipt_path?: string;
}

// Business Info types
export interface BusinessInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoPath?: string;
}

// Inventory types
export type InventoryMovementType = 'purchase' | 'adjustment' | 'return' | 'sale' | 'initial';

export interface InventoryMovement {
  id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  movement_type: InventoryMovementType;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  unit_cost?: number;
  created_by: number;
  created_by_username?: string;
  created_at: string;
}

export interface CreateInventoryDTO {
  product_id: number;
  quantity: number;
  movement_type: InventoryMovementType;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  unit_cost?: number;
}

// Report types
export interface SalesReportData {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  topCustomers: Array<{ name: string; transactions: number; revenue: number }>;
  dailySales: Array<{ date: string; revenue: number; transactions: number }>;
}

export interface InventoryReportData {
  totalValue: number;
  totalItems: number;
  lowStockItems: Array<{ id: number; name: string; stock_qty: number; buy_price: number }>;
  stockByCategory: Array<{ category: string; items: number; value: number }>;
  recentMovements: InventoryMovement[];
}

export interface TradingPLData {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number;
  expenses: number;
  expensesByCategory: Array<{ category: string; amount: number }>;
  netProfit: number;
  netMargin: number;
}

export interface BalanceSheetData {
  assets: {
    inventory: number;
    receivables: number;
    cash: number;
    total: number;
  };
  equity: number;
  asOfDate: string;
}

// User creation DTO
export interface CreateUserDTO {
  username: string;
  password: string;
  role: UserRole;
  email?: string;
}
