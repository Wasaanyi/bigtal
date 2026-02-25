import React, { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Table, Button, Drawer, Modal, Input, Select, TextArea } from '../components/ui';
import type { Expense, CreateExpenseDTO } from '../../shared/types';
import { EXPENSE_CATEGORIES } from '../../shared/constants';

export function ExpensesPage() {
  const { user } = useAuthStore();
  const {
    expenses,
    currencies,
    suppliers,
    isLoadingExpenses,
    fetchExpenses,
    fetchSuppliers,
    addExpense,
    updateExpense,
    removeExpense,
    addSupplier,
  } = useDataStore();
  const { showNotification } = useUIStore();

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline supplier creation
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateExpenseDTO>({
    supplier_id: undefined,
    currency_id: 1,
    description: '',
    amount: 0,
    category: '',
    receipt_path: undefined,
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user?.role) {
      fetchExpenses(user.role);
      fetchSuppliers();
    }
  }, [user?.role, fetchExpenses, fetchSuppliers]);

  useEffect(() => {
    // Set default currency
    const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];
    if (defaultCurrency && !editingExpense) {
      setFormData((prev) => ({ ...prev, currency_id: defaultCurrency.id }));
    }
  }, [currencies, editingExpense]);

  const openCreateModal = () => {
    setEditingExpense(null);
    const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];
    setFormData({
      supplier_id: undefined,
      currency_id: defaultCurrency?.id || 1,
      description: '',
      amount: 0,
      category: '',
      receipt_path: undefined,
    });
    setShowModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      supplier_id: expense.supplier_id,
      currency_id: expense.currency_id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category || '',
      receipt_path: expense.receipt_path,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      showNotification('error', 'Description is required');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      showNotification('error', 'Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        const response = await window.api.expenses.update(editingExpense.id, formData, user!.role);
        if (response.success && response.data) {
          updateExpense(response.data);
          showNotification('success', 'Expense updated successfully');
          setShowModal(false);
        } else {
          showNotification('error', response.error || 'Failed to update expense');
        }
      } else {
        const response = await window.api.expenses.create(formData, user!.role);
        if (response.success && response.data) {
          addExpense(response.data);
          showNotification('success', 'Expense recorded successfully');
          setShowModal(false);
        } else {
          showNotification('error', response.error || 'Failed to record expense');
        }
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await window.api.expenses.delete(expense.id, user!.role);
      if (response.success) {
        removeExpense(expense.id);
        showNotification('success', 'Expense deleted');
      } else {
        showNotification('error', response.error || 'Failed to delete expense');
      }
    } catch {
      showNotification('error', 'Failed to delete expense');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.name.trim()) {
      showNotification('error', 'Supplier name is required');
      return;
    }

    setIsCreatingSupplier(true);
    try {
      const response = await window.api.suppliers.create(supplierForm);
      if (response.success && response.data) {
        addSupplier(response.data);
        // Auto-select the newly created supplier
        setFormData({ ...formData, supplier_id: response.data.id });
        setShowSupplierModal(false);
        setSupplierForm({ name: '', phone: '', email: '' });
        showNotification('success', 'Supplier created');
      } else {
        showNotification('error', response.error || 'Failed to create supplier');
      }
    } catch {
      showNotification('error', 'Failed to create supplier');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = expenses.map((exp) => ({
        date: exp.created_at,
        description: exp.description,
        category: exp.category || '',
        amount: exp.amount,
        currency: exp.currency_code,
        supplier: exp.supplier_name || '',
      }));

      const columns = [
        { key: 'date', header: 'Date' },
        { key: 'description', header: 'Description' },
        { key: 'category', header: 'Category' },
        { key: 'amount', header: 'Amount' },
        { key: 'currency', header: 'Currency' },
        { key: 'supplier', header: 'Supplier' },
      ];

      const response = await window.api.export.csv(
        exportData,
        columns,
        `expenses-${new Date().toISOString().slice(0, 10)}.csv`
      );

      if (response.success) {
        showNotification('success', 'Expenses exported successfully');
      } else {
        if (response.error !== 'Export cancelled') {
          showNotification('error', response.error || 'Export failed');
        }
      }
    } catch {
      showNotification('error', 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      key: 'created_at',
      header: 'Date',
      render: (expense: Expense) => formatDate(expense.created_at),
    },
    {
      key: 'description',
      header: 'Description',
      render: (expense: Expense) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{expense.description}</p>
          {expense.category && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{expense.category}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (expense: Expense) => (
        <span className="font-medium text-red-600">
          {expense.currency_symbol} {expense.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      render: (expense: Expense) => expense.supplier_name || '-',
    },
    {
      key: 'actions',
      header: '',
      render: (expense: Expense) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(expense)}
            leftIcon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(expense)}
            leftIcon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            }
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Filter expenses by search query
  const filteredExpenses = expenses.filter((expense) =>
    expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    expense.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total expenses
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Expenses{searchQuery && ' (filtered)'}</p>
            <p className="text-3xl font-bold text-red-700 dark:text-red-300">
              {defaultCurrency?.symbol} {totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-primary-500 focus:border-primary-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Button
              variant="secondary"
              onClick={handleExport}
              isLoading={isExporting}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Export CSV
            </Button>
            <Button
              onClick={openCreateModal}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Expense
            </Button>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <Table
        columns={columns}
        data={filteredExpenses}
        keyExtractor={(expense) => expense.id}
        isLoading={isLoadingExpenses}
        emptyMessage="No expenses recorded"
      />

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExpense ? 'Edit Expense' : 'Record Expense'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {editingExpense ? 'Update' : 'Record'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What was this expense for?"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />

            <Select
              label="Currency"
              options={currencies.map((c) => ({ value: c.id, label: `${c.code} (${c.symbol})` }))}
              value={formData.currency_id}
              onChange={(e) => setFormData({ ...formData, currency_id: Number(e.target.value) })}
            />
          </div>

          <Select
            label="Category"
            options={[
              { value: '', label: 'Select category' },
              ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
            ]}
            value={formData.category || ''}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />

          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select
                  label="Supplier (Optional)"
                  options={[
                    { value: '', label: 'Select supplier' },
                    ...suppliers.filter(s => s.is_active !== false).map((s) => ({ value: s.id, label: s.name })),
                  ]}
                  value={formData.supplier_id || ''}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowSupplierModal(true)}
                className="mb-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Inline Supplier Creation Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title="Create Supplier"
      >
        <div className="space-y-4">
          <Input
            label="Supplier Name *"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
            placeholder="Enter supplier name"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              placeholder="Phone number"
            />
            <Input
              label="Email"
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              placeholder="Email address"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowSupplierModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSupplier} isLoading={isCreatingSupplier}>
              Create Supplier
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
