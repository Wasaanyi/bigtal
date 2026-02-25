import React, { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useUIStore } from '../store/uiStore';
import { Table, Button, Drawer, Input } from '../components/ui';
import type { Supplier, CreateSupplierDTO } from '../../shared/types';

export function SuppliersPage() {
  const {
    suppliers,
    isLoadingSuppliers,
    fetchSuppliers,
  } = useDataStore();
  const { showNotification } = useUIStore();

  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>([]);

  // Form state
  const [formData, setFormData] = useState<CreateSupplierDTO>({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    setLocalSuppliers(suppliers);
  }, [suppliers]);

  const filteredSuppliers = localSuppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
    });
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showNotification('error', 'Supplier name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSupplier) {
        const response = await window.api.suppliers.update(editingSupplier.id, formData);
        if (response.success && response.data) {
          setLocalSuppliers((prev) =>
            prev.map((s) => (s.id === response.data!.id ? response.data! : s))
          );
          showNotification('success', 'Supplier updated successfully');
          setShowModal(false);
        } else {
          showNotification('error', response.error || 'Failed to update supplier');
        }
      } else {
        const response = await window.api.suppliers.create(formData);
        if (response.success && response.data) {
          setLocalSuppliers((prev) => [...prev, response.data!]);
          showNotification('success', 'Supplier created successfully');
          setShowModal(false);
        } else {
          showNotification('error', response.error || 'Failed to create supplier');
        }
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete "${supplier.name}"?`)) return;

    try {
      const response = await window.api.suppliers.delete(supplier.id);
      if (response.success) {
        setLocalSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
        showNotification('success', 'Supplier deleted');
      } else {
        showNotification('error', response.error || 'Failed to delete supplier');
      }
    } catch {
      showNotification('error', 'Failed to delete supplier');
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
      render: (supplier: Supplier) => (
        <span className="font-medium text-gray-900 dark:text-white">{supplier.name}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (supplier: Supplier) => supplier.phone || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (supplier: Supplier) => supplier.email || '-',
    },
    {
      key: 'created_at',
      header: 'Added',
      render: (supplier: Supplier) => formatDate(supplier.created_at),
    },
    {
      key: 'actions',
      header: '',
      render: (supplier: Supplier) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(supplier)}
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
            onClick={() => handleDelete(supplier)}
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
            placeholder="Search suppliers..."
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
          Add Supplier
        </Button>
      </div>

      {/* Suppliers Table */}
      <Table
        columns={columns}
        data={filteredSuppliers}
        keyExtractor={(supplier) => supplier.id}
        isLoading={isLoadingSuppliers}
        emptyMessage="No suppliers found"
      />

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSupplier ? 'Edit Supplier' : 'New Supplier'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {editingSupplier ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Supplier Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter supplier name"
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
        </div>
      </Drawer>
    </div>
  );
}
