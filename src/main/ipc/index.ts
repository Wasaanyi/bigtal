import { ipcMain, BrowserWindow, dialog, app } from 'electron';
import { writeFileSync } from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/constants';
import {
  userRepository,
  currencyRepository,
  customerRepository,
  supplierRepository,
  categoryRepository,
  productRepository,
  invoiceRepository,
  expenseRepository,
  donationRepository,
  inventoryRepository,
  reportsRepository,
} from '../database/repositories';
import { recoveryService } from '../services/recoveryService';
import { exportService } from '../services/exportService';
import { emailService, EmailConfig } from '../services/emailService';
import { businessService } from '../services/businessService';
import { databaseBackupService } from '../services/databaseBackupService';
import type {
  ApiResponse,
  UserSession,
  CreateCustomerDTO,
  CreateSupplierDTO,
  CreateCategoryDTO,
  CreateProductDTO,
  CreateInvoiceDTO,
  CreateExpenseDTO,
  CreateInventoryDTO,
  InvoiceStatus,
  UserRole,
  BusinessInfo,
  User,
} from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

// Session store (in-memory for simplicity)
let currentSession: UserSession | null = null;

function createResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function createError(error: string): ApiResponse<never> {
  return { success: false, error };
}

async function sendLogoutNotification(user: User): Promise<void> {
  try {
    // Check if email config exists
    const emailConfig = await emailService.getConfig();
    if (!emailConfig || !emailConfig.host) {
      return; // No email configuration
    }

    // Get admin users with email
    const admins = await userRepository.findAdminsWithEmail();
    if (admins.length === 0) {
      return; // No admins with email configured
    }

    // Get business info for email
    const businessInfo = await businessService.getInfo();
    const businessName = businessInfo?.name || 'Bigtal';

    const timestamp = new Date().toLocaleString();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">User Sign-Out Notification</h2>
        <p>A user has signed out of ${businessName}:</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Username:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${user.username}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Role:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${user.role}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Sign-out Time:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${timestamp}</td>
          </tr>
        </table>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          This is an automated notification from ${businessName} powered by Bigtal.
        </p>
      </div>
    `;

    // Send to all admins with email
    for (const admin of admins) {
      if (admin.email) {
        await emailService.sendEmail(
          admin.email,
          `[${businessName}] User Sign-Out: ${user.username}`,
          html
        );
      }
    }
  } catch (error) {
    console.error('Failed to send logout notification:', error);
  }
}

export function registerIpcHandlers(): void {
  // Auth handlers
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, username: string, password: string) => {
    try {
      const user = await userRepository.validatePassword(username, password);
      if (!user) {
        return createError('Invalid username or password');
      }

      currentSession = {
        user,
        token: uuidv4(),
      };

      return createResponse(currentSession);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    // Capture user info before clearing
    const loggedOutUser = currentSession?.user;

    // Clear session
    currentSession = null;

    // Send notification (non-blocking)
    if (loggedOutUser) {
      sendLogoutNotification(loggedOutUser).catch(console.error);
    }

    return createResponse(undefined);
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, async () => {
    return createResponse(currentSession);
  });

  // Customer handlers
  ipcMain.handle(IPC_CHANNELS.CUSTOMER_CREATE, async (_event, data: CreateCustomerDTO) => {
    try {
      const customer = await customerRepository.create(data);
      return createResponse(customer);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER_LIST, async () => {
    try {
      const customers = await customerRepository.findAll();
      return createResponse(customers);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER_SEARCH, async (_event, query: string) => {
    try {
      const customers = await customerRepository.search(query);
      return createResponse(customers);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.CUSTOMER_UPDATE,
    async (_event, id: number, data: Partial<CreateCustomerDTO>) => {
      try {
        const customer = await customerRepository.update(id, data);
        if (!customer) {
          return createError('Customer not found');
        }
        return createResponse(customer);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.CUSTOMER_DELETE, async (_event, id: number) => {
    try {
      const deleted = await customerRepository.delete(id);
      if (!deleted) {
        return createError('Customer not found');
      }
      return createResponse(undefined);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER_HAS_RELATIONS, async (_event, id: number) => {
    try {
      const hasRelations = await customerRepository.hasRelatedRecords(id);
      return createResponse(hasRelations);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CUSTOMER_DISABLE, async (_event, id: number) => {
    try {
      const customer = await customerRepository.disable(id);
      if (!customer) {
        return createError('Customer not found');
      }
      return createResponse(customer);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Supplier handlers
  ipcMain.handle(IPC_CHANNELS.SUPPLIER_CREATE, async (_event, data: CreateSupplierDTO) => {
    try {
      const supplier = await supplierRepository.create(data);
      return createResponse(supplier);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SUPPLIER_LIST, async () => {
    try {
      const suppliers = await supplierRepository.findAll();
      return createResponse(suppliers);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.SUPPLIER_UPDATE,
    async (_event, id: number, data: Partial<CreateSupplierDTO>) => {
      try {
        const supplier = await supplierRepository.update(id, data);
        if (!supplier) {
          return createError('Supplier not found');
        }
        return createResponse(supplier);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.SUPPLIER_DELETE, async (_event, id: number) => {
    try {
      const deleted = await supplierRepository.delete(id);
      if (!deleted) {
        return createError('Supplier not found');
      }
      return createResponse(undefined);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SUPPLIER_HAS_RELATIONS, async (_event, id: number) => {
    try {
      const hasRelations = await supplierRepository.hasRelatedRecords(id);
      return createResponse(hasRelations);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SUPPLIER_DISABLE, async (_event, id: number) => {
    try {
      const supplier = await supplierRepository.disable(id);
      if (!supplier) {
        return createError('Supplier not found');
      }
      return createResponse(supplier);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Category handlers
  ipcMain.handle(IPC_CHANNELS.CATEGORY_CREATE, async (_event, data: CreateCategoryDTO) => {
    try {
      const category = await categoryRepository.create(data);
      return createResponse(category);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CATEGORY_LIST, async () => {
    try {
      const categories = await categoryRepository.findAll();
      return createResponse(categories);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.CATEGORY_UPDATE,
    async (_event, id: number, data: Partial<CreateCategoryDTO>) => {
      try {
        const category = await categoryRepository.update(id, data);
        if (!category) {
          return createError('Category not found');
        }
        return createResponse(category);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.CATEGORY_DELETE, async (_event, id: number) => {
    try {
      const deleted = await categoryRepository.delete(id);
      if (!deleted) {
        return createError('Category not found');
      }
      return createResponse(undefined);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Product handlers
  ipcMain.handle(
    IPC_CHANNELS.PRODUCT_CREATE,
    async (_event, data: CreateProductDTO, userRole: UserRole) => {
      try {
        if (userRole !== 'admin') {
          return createError('Only admins can create products');
        }
        const product = await productRepository.create(data);
        return createResponse(product);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.PRODUCT_LIST, async (_event, _userRole: UserRole) => {
    try {
      const products = await productRepository.findAll();
      return createResponse(products);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT_SEARCH, async (_event, query: string) => {
    try {
      const products = await productRepository.search(query);
      return createResponse(products);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.PRODUCT_UPDATE,
    async (_event, id: number, data: Partial<CreateProductDTO>, userRole: UserRole) => {
      try {
        if (userRole !== 'admin') {
          return createError('Only admins can update products');
        }
        const product = await productRepository.update(id, data);
        if (!product) {
          return createError('Product not found');
        }
        return createResponse(product);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.PRODUCT_UPDATE_STOCK, async (_event, id: number, quantity: number) => {
    try {
      const product = await productRepository.updateStock(id, quantity);
      if (!product) {
        return createError('Product not found');
      }
      return createResponse(product);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT_DELETE, async (_event, id: number, userRole: UserRole) => {
    try {
      if (userRole !== 'admin') {
        return createError('Only admins can delete products');
      }
      const deleted = await productRepository.delete(id);
      if (!deleted) {
        return createError('Product not found');
      }
      return createResponse(undefined);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT_HAS_RELATIONS, async (_event, id: number) => {
    try {
      const hasRelations = await productRepository.hasRelatedRecords(id);
      return createResponse(hasRelations);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PRODUCT_DISABLE, async (_event, id: number, userRole: UserRole) => {
    try {
      if (userRole !== 'admin') {
        return createError('Only admins can disable products');
      }
      const product = await productRepository.disable(id);
      if (!product) {
        return createError('Product not found');
      }
      return createResponse(product);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Invoice handlers
  ipcMain.handle(
    IPC_CHANNELS.INVOICE_CREATE,
    async (_event, data: CreateInvoiceDTO, userId: number) => {
      try {
        const invoice = await invoiceRepository.create(data, userId);
        return createResponse(invoice);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.INVOICE_LIST, async (_event, userRole: UserRole) => {
    try {
      const invoices = await invoiceRepository.findAll(userRole);
      return createResponse(invoices);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.INVOICE_GET, async (_event, id: number) => {
    try {
      const invoice = await invoiceRepository.findById(id);
      if (!invoice) {
        return createError('Invoice not found');
      }
      return createResponse(invoice);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.INVOICE_UPDATE_STATUS,
    async (_event, id: number, status: InvoiceStatus) => {
      try {
        const invoice = await invoiceRepository.updateStatus(id, status);
        if (!invoice) {
          return createError('Invoice not found');
        }
        return createResponse(invoice);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.INVOICE_DELETE, async (_event, id: number, userRole: UserRole) => {
    try {
      if (userRole !== 'admin') {
        return createError('Only admins can delete invoices');
      }
      const deleted = await invoiceRepository.delete(id);
      if (!deleted) {
        return createError('Invoice not found');
      }
      return createResponse(undefined);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Expense handlers
  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_CREATE,
    async (_event, data: CreateExpenseDTO, userRole: UserRole) => {
      try {
        if (userRole !== 'admin') {
          return createError('Only admins can create expenses');
        }
        const expense = await expenseRepository.create(data);
        return createResponse(expense);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.EXPENSE_LIST, async (_event, userRole: UserRole) => {
    try {
      if (userRole !== 'admin') {
        return createError('Only admins can view expenses');
      }
      const expenses = await expenseRepository.findAll();
      return createResponse(expenses);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.EXPENSE_UPDATE,
    async (_event, id: number, data: Partial<CreateExpenseDTO>, userRole: UserRole) => {
      try {
        if (userRole !== 'admin') {
          return createError('Only admins can update expenses');
        }
        const expense = await expenseRepository.update(id, data);
        if (!expense) {
          return createError('Expense not found');
        }
        return createResponse(expense);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.EXPENSE_DELETE, async (_event, id: number, userRole: UserRole) => {
    try {
      if (userRole !== 'admin') {
        return createError('Only admins can delete expenses');
      }
      const deleted = await expenseRepository.delete(id);
      if (!deleted) {
        return createError('Expense not found');
      }
      return createResponse(undefined);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Currency handlers
  ipcMain.handle(IPC_CHANNELS.CURRENCY_LIST, async () => {
    try {
      const currencies = await currencyRepository.findAll();
      return createResponse(currencies);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Dashboard handlers
  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, async (_event, _userRole: UserRole, year?: number) => {
    try {
      const todayIncome = await invoiceRepository.getTodayIncome();
      const todayExpenses = await expenseRepository.getTodayExpenses();
      const yearlyIncome = await invoiceRepository.getYearlyIncome(year);
      const yearlyExpenses = await expenseRepository.getYearlyExpenses(year);
      const overdueInvoices = await invoiceRepository.getOverdueInvoices();
      const topProducts = await invoiceRepository.getTopProducts(5);
      const defaultCurrency = await currencyRepository.getDefault();

      // Find the earliest year with any data
      const invoiceYear = await invoiceRepository.getEarliestYear();
      const expenseYear = await expenseRepository.getEarliestYear();
      const currentYear = new Date().getFullYear();
      const earliestYear = Math.min(
        invoiceYear ?? currentYear,
        expenseYear ?? currentYear,
      );

      return createResponse({
        todayIncome,
        todayExpenses,
        cashBalance: todayIncome - todayExpenses,
        yearlyIncome,
        yearlyExpenses,
        yearlyProfit: yearlyIncome - yearlyExpenses,
        earliestYear,
        overdueInvoices,
        topProducts,
        defaultCurrency,
      });
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Donation handlers
  ipcMain.handle(
    IPC_CHANNELS.DONATION_LOG,
    async (_event, deviceId: string, amount?: number, currencyCode?: string) => {
      try {
        await donationRepository.log(deviceId, amount, currencyCode);
        return createResponse(undefined);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  // User handlers
  ipcMain.handle(IPC_CHANNELS.USER_LIST, async () => {
    try {
      const users = await userRepository.findAll();
      return createResponse(users);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.USER_CREATE,
    async (_event, username: string, password: string, role: UserRole, email?: string) => {
      try {
        // Check if username exists
        const existing = await userRepository.findByUsername(username);
        if (existing) {
          return createError('Username already exists');
        }
        const user = await userRepository.create(username, password, role, email);
        return createResponse(user);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.USER_UPDATE_PASSWORD,
    async (_event, userId: number, newPassword: string) => {
      try {
        const success = await userRepository.updatePassword(userId, newPassword);
        if (!success) {
          return createError('User not found');
        }
        return createResponse(undefined);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.USER_DELETE,
    async (_event, userId: number, currentUserId: number) => {
      try {
        // Cannot delete yourself
        if (userId === currentUserId) {
          return createError('Cannot delete your own account');
        }

        // Check if this is the last admin
        const user = await userRepository.findById(userId);
        if (user?.role === 'admin') {
          const adminCount = await recoveryService.getAdminCount();
          if (adminCount <= 1) {
            return createError('Cannot delete the last admin account');
          }
        }

        const success = await userRepository.delete(userId);
        if (!success) {
          return createError('User not found');
        }
        return createResponse(undefined);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  // Recovery handlers
  ipcMain.handle(IPC_CHANNELS.RECOVERY_KEY_EXISTS, async () => {
    try {
      const exists = await recoveryService.recoveryKeyExists();
      return createResponse(exists);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECOVERY_KEY_SETUP, async () => {
    try {
      // Check if recovery key already exists
      const exists = await recoveryService.recoveryKeyExists();
      if (exists) {
        return createError('Recovery key already set up');
      }

      const recoveryKey = await recoveryService.generateRecoveryKey();
      return createResponse(recoveryKey);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.RECOVERY_KEY_VALIDATE, async (_event, recoveryKey: string) => {
    try {
      const isValid = await recoveryService.validateRecoveryKey(recoveryKey);
      return createResponse(isValid);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.RECOVERY_RESET_ADMIN,
    async (_event, recoveryKey: string, newPassword: string) => {
      try {
        const success = await recoveryService.resetAdminPassword(recoveryKey, newPassword);
        if (!success) {
          return createError('Invalid recovery key or admin not found');
        }
        return createResponse(undefined);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  // Export handler
  ipcMain.handle(
    IPC_CHANNELS.EXPORT_CSV,
    async (
      _event,
      data: Record<string, unknown>[],
      columns: { key: string; header: string }[],
      defaultFileName: string
    ) => {
      try {
        const result = await exportService.exportToCSV(data, columns, defaultFileName);
        if (result.success) {
          return createResponse(result.filePath);
        }
        return createError(result.error || 'Export failed');
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  // Email handlers
  ipcMain.handle(IPC_CHANNELS.EMAIL_GET_CONFIG, async () => {
    try {
      const config = await emailService.getConfig();
      return createResponse(config);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.EMAIL_SAVE_CONFIG, async (_event, config: EmailConfig) => {
    try {
      await emailService.saveConfig(config);
      return createResponse(undefined);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.EMAIL_TEST_CONNECTION, async (_event, config: EmailConfig) => {
    try {
      const result = await emailService.testConnection(config);
      if (result.success) {
        return createResponse(undefined);
      }
      return createError(result.error || 'Connection test failed');
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.EMAIL_SEND_INVOICE,
    async (
      _event,
      invoiceId: number,
      toEmail: string
    ) => {
      try {
        // Get invoice details
        const invoice = await invoiceRepository.findById(invoiceId);
        if (!invoice) {
          return createError('Invoice not found');
        }

        const currencySymbol = invoice.currency_symbol || '';
        const totalAmount = `${currencySymbol} ${invoice.total_amount.toLocaleString()}`;
        const dueDate = invoice.due_date
          ? new Date(invoice.due_date).toLocaleDateString()
          : undefined;

        // Get business info for email subject
        const businessInfo = await businessService.getInfo();
        const businessName = businessInfo?.name || 'Bigtal';

        const html = emailService.generateInvoiceEmailHtml(
          invoice.invoice_number,
          businessName,
          invoice.customer_name || 'Customer',
          totalAmount,
          dueDate
        );

        const result = await emailService.sendEmail(
          toEmail,
          `Invoice ${invoice.invoice_number} from Bigtal`,
          html
        );

        if (result.success) {
          return createResponse(undefined);
        }
        return createError(result.error || 'Failed to send email');
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  // Send invoice with PDF attachment
  ipcMain.handle(
    IPC_CHANNELS.EMAIL_SEND_INVOICE_PDF,
    async (event, invoiceId: number, toEmail: string) => {
      try {
        const invoice = await invoiceRepository.findById(invoiceId);
        if (!invoice) {
          return createError('Invoice not found');
        }

        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) {
          return createError('Window not found');
        }

        // Generate PDF from the current page (print view should be present)
        const pdfBuffer = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
        });

        const currencySymbol = invoice.currency_symbol || '';
        const totalAmount = `${currencySymbol} ${invoice.total_amount.toLocaleString()}`;
        const dueDate = invoice.due_date
          ? new Date(invoice.due_date).toLocaleDateString()
          : undefined;

        // Get business info for email subject
        const businessInfo = await businessService.getInfo();
        const businessName = businessInfo?.name || 'Bigtal';

        const html = emailService.generateInvoiceEmailHtml(
          invoice.invoice_number,
          businessName,
          invoice.customer_name || 'Customer',
          totalAmount,
          dueDate
        );

        const result = await emailService.sendEmail(
          toEmail,
          `Invoice ${invoice.invoice_number} from ${businessName}`,
          html,
          [{ filename: `${invoice.invoice_number}.pdf`, content: Buffer.from(pdfBuffer) }]
        );

        if (result.success) {
          return createResponse(undefined);
        }
        return createError(result.error || 'Failed to send email');
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  // Business handlers
  ipcMain.handle(IPC_CHANNELS.BUSINESS_GET_INFO, async () => {
    try {
      const info = await businessService.getInfo();
      return createResponse(info);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BUSINESS_SAVE_INFO, async (_event, info: BusinessInfo) => {
    try {
      await businessService.saveInfo(info);
      return createResponse(undefined);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BUSINESS_UPLOAD_LOGO, async () => {
    try {
      const result = await businessService.uploadLogo();
      if (result.success) {
        return createResponse(result.logoPath);
      }
      return createError(result.error || 'Upload failed');
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.BUSINESS_GET_LOGO, async (_event, logoPath: string) => {
    try {
      const dataUrl = await businessService.getLogoAsDataUrl(logoPath);
      return createResponse(dataUrl);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Print to PDF handler
  ipcMain.handle(IPC_CHANNELS.PRINT_SAVE_PDF, async (event, filename: string) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) {
        return createError('Window not found');
      }

      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        defaultPath: path.join(app.getPath('documents'), filename),
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      });

      if (canceled || !filePath) {
        return createError('Export cancelled');
      }

      const data = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      });
      writeFileSync(filePath, data);
      return createResponse(filePath);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // User email update handler
  ipcMain.handle(
    IPC_CHANNELS.USER_UPDATE_EMAIL,
    async (_event, userId: number, email: string | null) => {
      try {
        const success = await userRepository.updateEmail(userId, email);
        if (!success) {
          return createError('User not found');
        }
        return createResponse(undefined);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  // Inventory handlers
  ipcMain.handle(
    IPC_CHANNELS.INVENTORY_CREATE,
    async (_event, data: CreateInventoryDTO, userId: number) => {
      try {
        const movement = await inventoryRepository.create(data, userId);
        return createResponse(movement);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.INVENTORY_LIST, async (_event, limit?: number) => {
    try {
      const movements = await inventoryRepository.findAll(limit);
      return createResponse(movements);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.INVENTORY_GET_BY_PRODUCT, async (_event, productId: number) => {
    try {
      const movements = await inventoryRepository.findByProduct(productId);
      return createResponse(movements);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Database backup/restore handlers
  ipcMain.handle(IPC_CHANNELS.DATABASE_EXPORT, async () => {
    try {
      const result = await databaseBackupService.exportDatabase();
      if (result.success) {
        return createResponse(result.filePath);
      }
      return createError(result.error || 'Export failed');
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DATABASE_IMPORT, async () => {
    try {
      const result = await databaseBackupService.importDatabase();
      if (result.success) {
        return createResponse(undefined);
      }
      return createError(result.error || 'Import failed');
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  // Reports handlers
  ipcMain.handle(
    IPC_CHANNELS.REPORTS_SALES,
    async (_event, startDate: string, endDate: string) => {
      try {
        const report = await reportsRepository.getSalesReport(startDate, endDate);
        return createResponse(report);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.REPORTS_INVENTORY, async () => {
    try {
      const report = await reportsRepository.getInventoryReport();
      return createResponse(report);
    } catch (error) {
      return createError((error as Error).message);
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.REPORTS_TRADING_PL,
    async (_event, startDate: string, endDate: string) => {
      try {
        const report = await reportsRepository.getTradingPL(startDate, endDate);
        return createResponse(report);
      } catch (error) {
        return createError((error as Error).message);
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.REPORTS_BALANCE_SHEET, async (_event, asOfDate?: string) => {
    try {
      const report = await reportsRepository.getBalanceSheet(asOfDate);
      return createResponse(report);
    } catch (error) {
      return createError((error as Error).message);
    }
  });
}
