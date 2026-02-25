import { create } from 'zustand';
import type {
  Customer,
  Supplier,
  ProductCategory,
  Product,
  Invoice,
  Expense,
  Currency,
  DashboardStats,
  UserRole,
} from '../../shared/types';

interface DataState {
  // Data
  customers: Customer[];
  suppliers: Supplier[];
  categories: ProductCategory[];
  products: Product[];
  invoices: Invoice[];
  expenses: Expense[];
  currencies: Currency[];
  dashboardStats: DashboardStats | null;

  // Loading states
  isLoadingCustomers: boolean;
  isLoadingSuppliers: boolean;
  isLoadingCategories: boolean;
  isLoadingProducts: boolean;
  isLoadingInvoices: boolean;
  isLoadingExpenses: boolean;
  isLoadingCurrencies: boolean;
  isLoadingStats: boolean;

  // Actions
  fetchCustomers: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProducts: (userRole: UserRole) => Promise<void>;
  fetchInvoices: (userRole: UserRole) => Promise<void>;
  fetchExpenses: (userRole: UserRole) => Promise<void>;
  fetchCurrencies: () => Promise<void>;
  fetchDashboardStats: (userRole: UserRole, year?: number) => Promise<void>;

  // Data mutation helpers
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  removeCustomer: (id: number) => void;

  addSupplier: (supplier: Supplier) => void;

  addCategory: (category: ProductCategory) => void;

  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  removeProduct: (id: number) => void;

  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  removeInvoice: (id: number) => void;

  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  removeExpense: (id: number) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  customers: [],
  suppliers: [],
  categories: [],
  products: [],
  invoices: [],
  expenses: [],
  currencies: [],
  dashboardStats: null,

  isLoadingCustomers: false,
  isLoadingSuppliers: false,
  isLoadingCategories: false,
  isLoadingProducts: false,
  isLoadingInvoices: false,
  isLoadingExpenses: false,
  isLoadingCurrencies: false,
  isLoadingStats: false,

  fetchCustomers: async () => {
    set({ isLoadingCustomers: true });
    try {
      const response = await window.api.customers.list();
      if (response.success && response.data) {
        set({ customers: response.data });
      }
    } finally {
      set({ isLoadingCustomers: false });
    }
  },

  fetchSuppliers: async () => {
    set({ isLoadingSuppliers: true });
    try {
      const response = await window.api.suppliers.list();
      if (response.success && response.data) {
        set({ suppliers: response.data });
      }
    } finally {
      set({ isLoadingSuppliers: false });
    }
  },

  fetchCategories: async () => {
    set({ isLoadingCategories: true });
    try {
      const response = await window.api.categories.list();
      if (response.success && response.data) {
        set({ categories: response.data });
      }
    } finally {
      set({ isLoadingCategories: false });
    }
  },

  fetchProducts: async (userRole: UserRole) => {
    set({ isLoadingProducts: true });
    try {
      const response = await window.api.products.list(userRole);
      if (response.success && response.data) {
        set({ products: response.data });
      }
    } finally {
      set({ isLoadingProducts: false });
    }
  },

  fetchInvoices: async (userRole: UserRole) => {
    set({ isLoadingInvoices: true });
    try {
      const response = await window.api.invoices.list(userRole);
      if (response.success && response.data) {
        set({ invoices: response.data });
      }
    } finally {
      set({ isLoadingInvoices: false });
    }
  },

  fetchExpenses: async (userRole: UserRole) => {
    set({ isLoadingExpenses: true });
    try {
      const response = await window.api.expenses.list(userRole);
      if (response.success && response.data) {
        set({ expenses: response.data });
      }
    } finally {
      set({ isLoadingExpenses: false });
    }
  },

  fetchCurrencies: async () => {
    set({ isLoadingCurrencies: true });
    try {
      const response = await window.api.currencies.list();
      if (response.success && response.data) {
        set({ currencies: response.data });
      }
    } finally {
      set({ isLoadingCurrencies: false });
    }
  },

  fetchDashboardStats: async (userRole: UserRole, year?: number) => {
    set({ isLoadingStats: true });
    try {
      const response = await window.api.dashboard.getStats(userRole, year);
      if (response.success && response.data) {
        set({ dashboardStats: response.data });
      }
    } finally {
      set({ isLoadingStats: false });
    }
  },

  // Customer mutations
  addCustomer: (customer) =>
    set((state) => ({ customers: [...state.customers, customer] })),
  updateCustomer: (customer) =>
    set((state) => ({
      customers: state.customers.map((c) => (c.id === customer.id ? customer : c)),
    })),
  removeCustomer: (id) =>
    set((state) => ({ customers: state.customers.filter((c) => c.id !== id) })),

  // Supplier mutations
  addSupplier: (supplier) =>
    set((state) => ({ suppliers: [...state.suppliers, supplier] })),

  // Category mutations
  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),

  // Product mutations
  addProduct: (product) =>
    set((state) => ({ products: [...state.products, product] })),
  updateProduct: (product) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === product.id ? product : p)),
    })),
  removeProduct: (id) =>
    set((state) => ({ products: state.products.filter((p) => p.id !== id) })),

  // Invoice mutations
  addInvoice: (invoice) =>
    set((state) => ({ invoices: [invoice, ...state.invoices] })),
  updateInvoice: (invoice) =>
    set((state) => ({
      invoices: state.invoices.map((i) => (i.id === invoice.id ? invoice : i)),
    })),
  removeInvoice: (id) =>
    set((state) => ({ invoices: state.invoices.filter((i) => i.id !== id) })),

  // Expense mutations
  addExpense: (expense) =>
    set((state) => ({ expenses: [expense, ...state.expenses] })),
  updateExpense: (expense) =>
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)),
    })),
  removeExpense: (id) =>
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),
}));
