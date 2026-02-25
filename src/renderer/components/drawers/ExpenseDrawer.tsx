import React, { useState, useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Drawer, Button, Input, Select, TextArea, Modal, Autocomplete } from '../ui';
import type { CreateExpenseDTO, CreateSupplierDTO } from '../../../shared/types';
import { EXPENSE_CATEGORIES } from '../../../shared/constants';

export function ExpenseDrawer() {
  const { user } = useAuthStore();
  const { currencies, suppliers, fetchSuppliers, addExpense, addSupplier } = useDataStore();
  const { activeDrawer, closeDrawer, showNotification } = useUIStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  const [formData, setFormData] = useState<CreateExpenseDTO>({
    supplier_id: undefined,
    currency_id: 1,
    description: '',
    amount: 0,
    category: '',
    receipt_path: undefined,
  });

  useEffect(() => {
    if (activeDrawer === 'expense') {
      fetchSuppliers();
      const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];
      setFormData({
        supplier_id: undefined,
        currency_id: defaultCurrency?.id || 1,
        description: '',
        amount: 0,
        category: '',
        receipt_path: undefined,
      });
    }
  }, [activeDrawer, currencies, fetchSuppliers]);

  const supplierOptions = suppliers.map((s) => ({
    id: s.id,
    label: s.name,
    subtitle: s.phone || s.email,
  }));

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;

    setIsCreatingSupplier(true);
    try {
      const data: CreateSupplierDTO = {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
      };

      const response = await window.api.suppliers.create(data);
      if (response.success && response.data) {
        addSupplier(response.data);
        setFormData({ ...formData, supplier_id: response.data.id });
        setShowNewSupplierModal(false);
        setNewSupplierName('');
        setNewSupplierPhone('');
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
      const response = await window.api.expenses.create(formData, user!.role);
      if (response.success && response.data) {
        addExpense(response.data);
        showNotification('success', 'Expense recorded successfully');
        closeDrawer();
      } else {
        showNotification('error', response.error || 'Failed to record expense');
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === formData.supplier_id);

  return (
    <>
      <Drawer
        isOpen={activeDrawer === 'expense'}
        onClose={closeDrawer}
        title="Record Expense"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              Record
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

          <Autocomplete
            label="Supplier (Optional)"
            placeholder="Search or create supplier..."
            options={supplierOptions}
            value={selectedSupplier ? { id: selectedSupplier.id, label: selectedSupplier.name } : null}
            onChange={(option) => {
              setFormData({ ...formData, supplier_id: option?.id });
            }}
            onCreateNew={(name) => {
              setNewSupplierName(name);
              setShowNewSupplierModal(true);
            }}
            createNewLabel="Create supplier"
          />
        </div>
      </Drawer>

      {/* New Supplier Modal */}
      <Modal
        isOpen={showNewSupplierModal}
        onClose={() => setShowNewSupplierModal(false)}
        title="Create New Supplier"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewSupplierModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSupplier} isLoading={isCreatingSupplier}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Supplier Name"
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
            placeholder="Enter supplier name"
            autoFocus
          />
          <Input
            label="Phone (Optional)"
            value={newSupplierPhone}
            onChange={(e) => setNewSupplierPhone(e.target.value)}
            placeholder="Enter phone number"
          />
        </div>
      </Modal>
    </>
  );
}
