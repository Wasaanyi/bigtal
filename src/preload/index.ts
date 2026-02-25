import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type {
  UserSession,
  Customer,
  Supplier,
  ProductCategory,
  Product,
  Invoice,
  InvoiceWithItems,
  Expense,
  Currency,
  DashboardStats,
  ApiResponse,
  CreateCustomerDTO,
  CreateSupplierDTO,
  CreateCategoryDTO,
  CreateProductDTO,
  CreateInvoiceDTO,
  CreateExpenseDTO,
  CreateInventoryDTO,
  InventoryMovement,
  InvoiceStatus,
  UserRole,
  BusinessInfo,
  SalesReportData,
  InventoryReportData,
  TradingPLData,
  BalanceSheetData,
  UpdateAvailableInfo,
  UpdateProgressInfo,
} from '../shared/types';

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('api', {
  // Auth
  auth: {
    login: (username: string, password: string): Promise<ApiResponse<UserSession>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, username, password),
    logout: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
    getSession: (): Promise<ApiResponse<UserSession | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION),
  },

  // Customers
  customers: {
    create: (data: CreateCustomerDTO): Promise<ApiResponse<Customer>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER_CREATE, data),
    list: (): Promise<ApiResponse<Customer[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER_LIST),
    search: (query: string): Promise<ApiResponse<Customer[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER_SEARCH, query),
    update: (id: number, data: Partial<CreateCustomerDTO>): Promise<ApiResponse<Customer>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER_UPDATE, id, data),
    delete: (id: number): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER_DELETE, id),
    hasRelations: (id: number): Promise<ApiResponse<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER_HAS_RELATIONS, id),
    disable: (id: number): Promise<ApiResponse<Customer>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CUSTOMER_DISABLE, id),
  },

  // Suppliers
  suppliers: {
    create: (data: CreateSupplierDTO): Promise<ApiResponse<Supplier>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUPPLIER_CREATE, data),
    list: (): Promise<ApiResponse<Supplier[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUPPLIER_LIST),
    update: (id: number, data: Partial<CreateSupplierDTO>): Promise<ApiResponse<Supplier>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUPPLIER_UPDATE, id, data),
    delete: (id: number): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUPPLIER_DELETE, id),
    hasRelations: (id: number): Promise<ApiResponse<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUPPLIER_HAS_RELATIONS, id),
    disable: (id: number): Promise<ApiResponse<Supplier>> =>
      ipcRenderer.invoke(IPC_CHANNELS.SUPPLIER_DISABLE, id),
  },

  // Categories
  categories: {
    create: (data: CreateCategoryDTO): Promise<ApiResponse<ProductCategory>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_CREATE, data),
    list: (): Promise<ApiResponse<ProductCategory[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_LIST),
    update: (id: number, data: Partial<CreateCategoryDTO>): Promise<ApiResponse<ProductCategory>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_UPDATE, id, data),
    delete: (id: number): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_DELETE, id),
  },

  // Products
  products: {
    create: (data: CreateProductDTO, userRole: UserRole): Promise<ApiResponse<Product>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_CREATE, data, userRole),
    list: (userRole: UserRole): Promise<ApiResponse<Product[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_LIST, userRole),
    search: (query: string): Promise<ApiResponse<Product[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_SEARCH, query),
    update: (id: number, data: Partial<CreateProductDTO>, userRole: UserRole): Promise<ApiResponse<Product>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_UPDATE, id, data, userRole),
    updateStock: (id: number, quantity: number): Promise<ApiResponse<Product>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_UPDATE_STOCK, id, quantity),
    delete: (id: number, userRole: UserRole): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_DELETE, id, userRole),
    hasRelations: (id: number): Promise<ApiResponse<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_HAS_RELATIONS, id),
    disable: (id: number, userRole: UserRole): Promise<ApiResponse<Product>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRODUCT_DISABLE, id, userRole),
  },

  // Invoices
  invoices: {
    create: (data: CreateInvoiceDTO, userId: number): Promise<ApiResponse<InvoiceWithItems>> =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_CREATE, data, userId),
    list: (userRole: UserRole): Promise<ApiResponse<Invoice[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_LIST, userRole),
    get: (id: number): Promise<ApiResponse<InvoiceWithItems>> =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_GET, id),
    updateStatus: (id: number, status: InvoiceStatus): Promise<ApiResponse<Invoice>> =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_UPDATE_STATUS, id, status),
    delete: (id: number, userRole: UserRole): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.INVOICE_DELETE, id, userRole),
  },

  // Expenses
  expenses: {
    create: (data: CreateExpenseDTO, userRole: UserRole): Promise<ApiResponse<Expense>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_CREATE, data, userRole),
    list: (userRole: UserRole): Promise<ApiResponse<Expense[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_LIST, userRole),
    update: (id: number, data: Partial<CreateExpenseDTO>, userRole: UserRole): Promise<ApiResponse<Expense>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_UPDATE, id, data, userRole),
    delete: (id: number, userRole: UserRole): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPENSE_DELETE, id, userRole),
  },

  // Currencies
  currencies: {
    list: (): Promise<ApiResponse<Currency[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.CURRENCY_LIST),
  },

  // Dashboard
  dashboard: {
    getStats: (userRole: UserRole, year?: number): Promise<ApiResponse<DashboardStats>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DASHBOARD_STATS, userRole, year),
  },

  // External
  openExternal: (url: string): Promise<ApiResponse<void>> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_URL, url),

  // Donations
  donations: {
    log: (deviceId: string, amount?: number, currencyCode?: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DONATION_LOG, deviceId, amount, currencyCode),
  },

  // Users
  users: {
    list: (): Promise<ApiResponse<import('../shared/types').User[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_LIST),
    create: (username: string, password: string, role: import('../shared/types').UserRole, email?: string): Promise<ApiResponse<import('../shared/types').User>> =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_CREATE, username, password, role, email),
    updatePassword: (userId: number, newPassword: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE_PASSWORD, userId, newPassword),
    updateEmail: (userId: number, email: string | null): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE_EMAIL, userId, email),
    delete: (userId: number, currentUserId: number): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_DELETE, userId, currentUserId),
  },

  // Recovery
  recovery: {
    exists: (): Promise<ApiResponse<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.RECOVERY_KEY_EXISTS),
    setup: (): Promise<ApiResponse<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.RECOVERY_KEY_SETUP),
    validate: (recoveryKey: string): Promise<ApiResponse<boolean>> =>
      ipcRenderer.invoke(IPC_CHANNELS.RECOVERY_KEY_VALIDATE, recoveryKey),
    resetAdmin: (recoveryKey: string, newPassword: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.RECOVERY_RESET_ADMIN, recoveryKey, newPassword),
  },

  // Export
  export: {
    csv: (
      data: Record<string, unknown>[],
      columns: { key: string; header: string }[],
      defaultFileName: string
    ): Promise<ApiResponse<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CSV, data, columns, defaultFileName),
  },

  // Print
  print: {
    savePdf: (filename: string): Promise<ApiResponse<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.PRINT_SAVE_PDF, filename),
  },

  // Email
  email: {
    getConfig: (): Promise<ApiResponse<{
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      fromName: string;
      fromEmail: string;
    } | null>> => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_GET_CONFIG),
    saveConfig: (config: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      fromName: string;
      fromEmail: string;
    }): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EMAIL_SAVE_CONFIG, config),
    testConnection: (config: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      fromName: string;
      fromEmail: string;
    }): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EMAIL_TEST_CONNECTION, config),
    sendInvoice: (invoiceId: number, toEmail: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EMAIL_SEND_INVOICE, invoiceId, toEmail),
    sendInvoicePdf: (invoiceId: number, toEmail: string): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.EMAIL_SEND_INVOICE_PDF, invoiceId, toEmail),
  },

  // Business
  business: {
    getInfo: (): Promise<ApiResponse<BusinessInfo | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BUSINESS_GET_INFO),
    saveInfo: (info: BusinessInfo): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BUSINESS_SAVE_INFO, info),
    uploadLogo: (): Promise<ApiResponse<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BUSINESS_UPLOAD_LOGO),
    getLogo: (logoPath: string): Promise<ApiResponse<string | null>> =>
      ipcRenderer.invoke(IPC_CHANNELS.BUSINESS_GET_LOGO, logoPath),
  },

  // Inventory
  inventory: {
    create: (data: CreateInventoryDTO, userId: number): Promise<ApiResponse<InventoryMovement>> =>
      ipcRenderer.invoke(IPC_CHANNELS.INVENTORY_CREATE, data, userId),
    list: (limit?: number): Promise<ApiResponse<InventoryMovement[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.INVENTORY_LIST, limit),
    getByProduct: (productId: number): Promise<ApiResponse<InventoryMovement[]>> =>
      ipcRenderer.invoke(IPC_CHANNELS.INVENTORY_GET_BY_PRODUCT, productId),
  },

  // Database backup/restore
  database: {
    export: (): Promise<ApiResponse<string>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_EXPORT),
    import: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.DATABASE_IMPORT),
  },

  // Reports
  reports: {
    sales: (startDate: string, endDate: string): Promise<ApiResponse<SalesReportData>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORTS_SALES, startDate, endDate),
    inventory: (): Promise<ApiResponse<InventoryReportData>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORTS_INVENTORY),
    tradingPL: (startDate: string, endDate: string): Promise<ApiResponse<TradingPLData>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORTS_TRADING_PL, startDate, endDate),
    balanceSheet: (asOfDate?: string): Promise<ApiResponse<BalanceSheetData>> =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORTS_BALANCE_SHEET, asOfDate),
  },

  // Updater
  updater: {
    check: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),
    download: (): Promise<ApiResponse<void>> =>
      ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD),
    install: (): void => { ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL); },
    onAvailable: (cb: (info: UpdateAvailableInfo) => void): (() => void) => {
      ipcRenderer.on(IPC_CHANNELS.UPDATER_AVAILABLE, (_e, info) => cb(info));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.UPDATER_AVAILABLE);
    },
    onNotAvailable: (cb: () => void): (() => void) => {
      ipcRenderer.on(IPC_CHANNELS.UPDATER_NOT_AVAILABLE, () => cb());
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.UPDATER_NOT_AVAILABLE);
    },
    onProgress: (cb: (info: UpdateProgressInfo) => void): (() => void) => {
      ipcRenderer.on(IPC_CHANNELS.UPDATER_PROGRESS, (_e, info) => cb(info));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.UPDATER_PROGRESS);
    },
    onDownloaded: (cb: () => void): (() => void) => {
      ipcRenderer.on(IPC_CHANNELS.UPDATER_DOWNLOADED, () => cb());
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.UPDATER_DOWNLOADED);
    },
    onError: (cb: (message: string) => void): (() => void) => {
      ipcRenderer.on(IPC_CHANNELS.UPDATER_ERROR, (_e, msg) => cb(msg));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.UPDATER_ERROR);
    },
    removeListeners: (): void => {
      [
        IPC_CHANNELS.UPDATER_AVAILABLE,
        IPC_CHANNELS.UPDATER_NOT_AVAILABLE,
        IPC_CHANNELS.UPDATER_PROGRESS,
        IPC_CHANNELS.UPDATER_DOWNLOADED,
        IPC_CHANNELS.UPDATER_ERROR,
      ].forEach((ch) => ipcRenderer.removeAllListeners(ch));
    },
  },
});

// Type declarations for renderer
declare global {
  interface Window {
    api: {
      auth: {
        login: (username: string, password: string) => Promise<ApiResponse<UserSession>>;
        logout: () => Promise<ApiResponse<void>>;
        getSession: () => Promise<ApiResponse<UserSession | null>>;
      };
      customers: {
        create: (data: CreateCustomerDTO) => Promise<ApiResponse<Customer>>;
        list: () => Promise<ApiResponse<Customer[]>>;
        search: (query: string) => Promise<ApiResponse<Customer[]>>;
        update: (id: number, data: Partial<CreateCustomerDTO>) => Promise<ApiResponse<Customer>>;
        delete: (id: number) => Promise<ApiResponse<void>>;
        hasRelations: (id: number) => Promise<ApiResponse<boolean>>;
        disable: (id: number) => Promise<ApiResponse<Customer>>;
      };
      suppliers: {
        create: (data: CreateSupplierDTO) => Promise<ApiResponse<Supplier>>;
        list: () => Promise<ApiResponse<Supplier[]>>;
        update: (id: number, data: Partial<CreateSupplierDTO>) => Promise<ApiResponse<Supplier>>;
        delete: (id: number) => Promise<ApiResponse<void>>;
        hasRelations: (id: number) => Promise<ApiResponse<boolean>>;
        disable: (id: number) => Promise<ApiResponse<Supplier>>;
      };
      categories: {
        create: (data: CreateCategoryDTO) => Promise<ApiResponse<ProductCategory>>;
        list: () => Promise<ApiResponse<ProductCategory[]>>;
        update: (id: number, data: Partial<CreateCategoryDTO>) => Promise<ApiResponse<ProductCategory>>;
        delete: (id: number) => Promise<ApiResponse<void>>;
      };
      products: {
        create: (data: CreateProductDTO, userRole: UserRole) => Promise<ApiResponse<Product>>;
        list: (userRole: UserRole) => Promise<ApiResponse<Product[]>>;
        search: (query: string) => Promise<ApiResponse<Product[]>>;
        update: (id: number, data: Partial<CreateProductDTO>, userRole: UserRole) => Promise<ApiResponse<Product>>;
        updateStock: (id: number, quantity: number) => Promise<ApiResponse<Product>>;
        delete: (id: number, userRole: UserRole) => Promise<ApiResponse<void>>;
        hasRelations: (id: number) => Promise<ApiResponse<boolean>>;
        disable: (id: number, userRole: UserRole) => Promise<ApiResponse<Product>>;
      };
      invoices: {
        create: (data: CreateInvoiceDTO, userId: number) => Promise<ApiResponse<InvoiceWithItems>>;
        list: (userRole: UserRole) => Promise<ApiResponse<Invoice[]>>;
        get: (id: number) => Promise<ApiResponse<InvoiceWithItems>>;
        updateStatus: (id: number, status: InvoiceStatus) => Promise<ApiResponse<Invoice>>;
        delete: (id: number, userRole: UserRole) => Promise<ApiResponse<void>>;
      };
      expenses: {
        create: (data: CreateExpenseDTO, userRole: UserRole) => Promise<ApiResponse<Expense>>;
        list: (userRole: UserRole) => Promise<ApiResponse<Expense[]>>;
        update: (id: number, data: Partial<CreateExpenseDTO>, userRole: UserRole) => Promise<ApiResponse<Expense>>;
        delete: (id: number, userRole: UserRole) => Promise<ApiResponse<void>>;
      };
      currencies: {
        list: () => Promise<ApiResponse<Currency[]>>;
      };
      dashboard: {
        getStats: (userRole: UserRole, year?: number) => Promise<ApiResponse<DashboardStats>>;
      };
      openExternal: (url: string) => Promise<ApiResponse<void>>;
      donations: {
        log: (deviceId: string, amount?: number, currencyCode?: string) => Promise<ApiResponse<void>>;
      };
      users: {
        list: () => Promise<ApiResponse<import('../shared/types').User[]>>;
        create: (username: string, password: string, role: import('../shared/types').UserRole, email?: string) => Promise<ApiResponse<import('../shared/types').User>>;
        updatePassword: (userId: number, newPassword: string) => Promise<ApiResponse<void>>;
        updateEmail: (userId: number, email: string | null) => Promise<ApiResponse<void>>;
        delete: (userId: number, currentUserId: number) => Promise<ApiResponse<void>>;
      };
      recovery: {
        exists: () => Promise<ApiResponse<boolean>>;
        setup: () => Promise<ApiResponse<string>>;
        validate: (recoveryKey: string) => Promise<ApiResponse<boolean>>;
        resetAdmin: (recoveryKey: string, newPassword: string) => Promise<ApiResponse<void>>;
      };
      export: {
        csv: (
          data: Record<string, unknown>[],
          columns: { key: string; header: string }[],
          defaultFileName: string
        ) => Promise<ApiResponse<string>>;
      };
      print: {
        savePdf: (filename: string) => Promise<ApiResponse<string>>;
      };
      email: {
        getConfig: () => Promise<ApiResponse<{
          host: string;
          port: number;
          secure: boolean;
          user: string;
          password: string;
          fromName: string;
          fromEmail: string;
        } | null>>;
        saveConfig: (config: {
          host: string;
          port: number;
          secure: boolean;
          user: string;
          password: string;
          fromName: string;
          fromEmail: string;
        }) => Promise<ApiResponse<void>>;
        testConnection: (config: {
          host: string;
          port: number;
          secure: boolean;
          user: string;
          password: string;
          fromName: string;
          fromEmail: string;
        }) => Promise<ApiResponse<void>>;
        sendInvoice: (invoiceId: number, toEmail: string) => Promise<ApiResponse<void>>;
        sendInvoicePdf: (invoiceId: number, toEmail: string) => Promise<ApiResponse<void>>;
      };
      business: {
        getInfo: () => Promise<ApiResponse<import('../shared/types').BusinessInfo | null>>;
        saveInfo: (info: import('../shared/types').BusinessInfo) => Promise<ApiResponse<void>>;
        uploadLogo: () => Promise<ApiResponse<string>>;
        getLogo: (logoPath: string) => Promise<ApiResponse<string | null>>;
      };
      inventory: {
        create: (data: CreateInventoryDTO, userId: number) => Promise<ApiResponse<InventoryMovement>>;
        list: (limit?: number) => Promise<ApiResponse<InventoryMovement[]>>;
        getByProduct: (productId: number) => Promise<ApiResponse<InventoryMovement[]>>;
      };
      database: {
        export: () => Promise<ApiResponse<string>>;
        import: () => Promise<ApiResponse<void>>;
      };
      reports: {
        sales: (startDate: string, endDate: string) => Promise<ApiResponse<SalesReportData>>;
        inventory: () => Promise<ApiResponse<InventoryReportData>>;
        tradingPL: (startDate: string, endDate: string) => Promise<ApiResponse<TradingPLData>>;
        balanceSheet: (asOfDate?: string) => Promise<ApiResponse<BalanceSheetData>>;
      };
      updater: {
        check: () => Promise<ApiResponse<void>>;
        download: () => Promise<ApiResponse<void>>;
        install: () => void;
        onAvailable: (cb: (info: UpdateAvailableInfo) => void) => () => void;
        onNotAvailable: (cb: () => void) => () => void;
        onProgress: (cb: (info: UpdateProgressInfo) => void) => () => void;
        onDownloaded: (cb: () => void) => () => void;
        onError: (cb: (message: string) => void) => () => void;
        removeListeners: () => void;
      };
    };
  }
}
