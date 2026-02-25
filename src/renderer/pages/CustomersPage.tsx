import React, { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useUIStore } from '../store/uiStore';
import { Table, Button, Drawer, Input, Select } from '../components/ui';
import type { Customer, CreateCustomerDTO } from '../../shared/types';

export function CustomersPage() {
  const {
    customers,
    currencies,
    isLoadingCustomers,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    removeCustomer,
  } = useDataStore();
  const { showNotification } = useUIStore();

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateCustomerDTO>({
    name: '',
    phone: '',
    email: '',
    address: '',
    currency_id: undefined,
  });

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingCustomer(null);
    const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      currency_id: defaultCurrency?.id,
    });
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      currency_id: customer.currency_id,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showNotification('error', 'Customer name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        const response = await window.api.customers.update(editingCustomer.id, formData);
        if (response.success && response.data) {
          updateCustomer(response.data);
          showNotification('success', 'Customer updated successfully');
          setShowModal(false);
        } else {
          showNotification('error', response.error || 'Failed to update customer');
        }
      } else {
        const response = await window.api.customers.create(formData);
        if (response.success && response.data) {
          addCustomer(response.data);
          showNotification('success', 'Customer created successfully');
          setShowModal(false);
        } else {
          showNotification('error', response.error || 'Failed to create customer');
        }
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete "${customer.name}"?`)) return;

    try {
      const response = await window.api.customers.delete(customer.id);
      if (response.success) {
        removeCustomer(customer.id);
        showNotification('success', 'Customer deleted');
      } else {
        showNotification('error', response.error || 'Failed to delete customer');
      }
    } catch {
      showNotification('error', 'Failed to delete customer');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (customer: Customer) => (
        <span className="font-medium text-gray-900 dark:text-white">{customer.name}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (customer: Customer) => customer.phone || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (customer: Customer) => customer.email || '-',
    },
    {
      key: 'address',
      header: 'Address',
      render: (customer: Customer) => customer.address || '-',
    },
    {
      key: 'created_at',
      header: 'Added',
      render: (customer: Customer) => formatDate(customer.created_at),
    },
    {
      key: 'actions',
      header: '',
      render: (customer: Customer) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(customer)}
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
            onClick={() => handleDelete(customer)}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        <Button
          onClick={openCreateModal}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add Customer
        </Button>
      </div>

      {/* Customers Table */}
      <Table
        columns={columns}
        data={filteredCustomers}
        keyExtractor={(customer) => customer.id}
        isLoading={isLoadingCustomers}
        emptyMessage="No customers found"
      />

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCustomer ? 'Edit Customer' : 'New Customer'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {editingCustomer ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Customer Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter customer name"
          />

          <Input
            label="Phone"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />

          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
          />

          <Input
            label="Address"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Enter address"
          />

          <Select
            label="Preferred Currency"
            options={[
              { value: '', label: 'Default (UGX)' },
              ...currencies.map((c) => ({ value: c.id, label: `${c.code} (${c.symbol})` })),
            ]}
            value={formData.currency_id || ''}
            onChange={(e) => setFormData({ ...formData, currency_id: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </Drawer>
    </div>
  );
}
