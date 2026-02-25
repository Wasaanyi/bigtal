// IPC Channel Constants
export const IPC_CHANNELS = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_SESSION: 'auth:get-session',

  // Customers
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_LIST: 'customer:list',
  CUSTOMER_SEARCH: 'customer:search',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_DELETE: 'customer:delete',
  CUSTOMER_HAS_RELATIONS: 'customer:has-relations',
  CUSTOMER_DISABLE: 'customer:disable',

  // Suppliers
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_LIST: 'supplier:list',
  SUPPLIER_UPDATE: 'supplier:update',
  SUPPLIER_DELETE: 'supplier:delete',
  SUPPLIER_HAS_RELATIONS: 'supplier:has-relations',
  SUPPLIER_DISABLE: 'supplier:disable',

  // Categories
  CATEGORY_CREATE: 'category:create',
  CATEGORY_LIST: 'category:list',
  CATEGORY_UPDATE: 'category:update',
  CATEGORY_DELETE: 'category:delete',

  // Products
  PRODUCT_CREATE: 'product:create',
  PRODUCT_LIST: 'product:list',
  PRODUCT_SEARCH: 'product:search',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_UPDATE_STOCK: 'product:update-stock',
  PRODUCT_DELETE: 'product:delete',
  PRODUCT_HAS_RELATIONS: 'product:has-relations',
  PRODUCT_DISABLE: 'product:disable',

  // Invoices
  INVOICE_CREATE: 'invoice:create',
  INVOICE_LIST: 'invoice:list',
  INVOICE_GET: 'invoice:get',
  INVOICE_UPDATE_STATUS: 'invoice:update-status',
  INVOICE_DELETE: 'invoice:delete',

  // Expenses
  EXPENSE_CREATE: 'expense:create',
  EXPENSE_LIST: 'expense:list',
  EXPENSE_UPDATE: 'expense:update',
  EXPENSE_DELETE: 'expense:delete',

  // Currencies
  CURRENCY_LIST: 'currency:list',

  // Dashboard
  DASHBOARD_STATS: 'dashboard:stats',

  // External
  OPEN_EXTERNAL_URL: 'external:open-url',

  // Donations
  DONATION_LOG: 'donation:log',

  // Users
  USER_LIST: 'user:list',
  USER_CREATE: 'user:create',
  USER_UPDATE_PASSWORD: 'user:update-password',
  USER_DELETE: 'user:delete',

  // Recovery
  RECOVERY_KEY_EXISTS: 'recovery:exists',
  RECOVERY_KEY_SETUP: 'recovery:setup',
  RECOVERY_KEY_VALIDATE: 'recovery:validate',
  RECOVERY_RESET_ADMIN: 'recovery:reset-admin',

  // Export
  EXPORT_CSV: 'export:csv',

  // Print
  PRINT_SAVE_PDF: 'print:save-pdf',

  // Email
  EMAIL_GET_CONFIG: 'email:get-config',
  EMAIL_SAVE_CONFIG: 'email:save-config',
  EMAIL_TEST_CONNECTION: 'email:test-connection',
  EMAIL_SEND_INVOICE: 'email:send-invoice',
  EMAIL_SEND_INVOICE_PDF: 'email:send-invoice-pdf',

  // Business
  BUSINESS_GET_INFO: 'business:get-info',
  BUSINESS_SAVE_INFO: 'business:save-info',
  BUSINESS_UPLOAD_LOGO: 'business:upload-logo',
  BUSINESS_GET_LOGO: 'business:get-logo',

  // Inventory
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_LIST: 'inventory:list',
  INVENTORY_GET_BY_PRODUCT: 'inventory:get-by-product',

  // Database backup/restore
  DATABASE_EXPORT: 'database:export',
  DATABASE_IMPORT: 'database:import',

  // Reports
  REPORTS_SALES: 'reports:sales',
  REPORTS_INVENTORY: 'reports:inventory',
  REPORTS_TRADING_PL: 'reports:trading-pl',
  REPORTS_BALANCE_SHEET: 'reports:balance-sheet',

  // User email
  USER_UPDATE_EMAIL: 'user:update-email',

  // Updater
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_AVAILABLE: 'updater:available',
  UPDATER_NOT_AVAILABLE: 'updater:not-available',
  UPDATER_PROGRESS: 'updater:progress',
  UPDATER_DOWNLOADED: 'updater:downloaded',
  UPDATER_ERROR: 'updater:error',
} as const;

// Default currencies for African markets
export const DEFAULT_CURRENCIES = [
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
];

// Invoice statuses
export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'] as const;

// Product types
export const PRODUCT_TYPES = ['sell', 'buy', 'both'] as const;

// User roles
export const USER_ROLES = ['admin', 'attendant'] as const;

// Expense categories
export const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Salaries',
  'Inventory',
  'Transport',
  'Marketing',
  'Maintenance',
  'Other',
] as const;

// Pesapal donation link
export const PESAPAL_DONATION_URL = 'https://store.pesapal.com/buymecoffeebigtal';

// App info
export const APP_NAME = 'Bigtal';
export const APP_VERSION = '1.0.0';
