import React, { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Table, Button, Drawer, Input, Select, TextArea } from '../components/ui';
import type { InventoryMovement, CreateInventoryDTO, InventoryMovementType } from '../../shared/types';

const MOVEMENT_TYPES: { value: InventoryMovementType; label: string }[] = [
  { value: 'purchase', label: 'Purchase (Stock In)' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
  { value: 'initial', label: 'Initial Stock' },
];

export function InventoryPage() {
  const { user } = useAuthStore();
  const { products, fetchProducts } = useDataStore();
  const { showNotification } = useUIStore();

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<InventoryMovementType | 'all'>('all');

  // Form state
  const [formData, setFormData] = useState<CreateInventoryDTO>({
    product_id: 0,
    quantity: 0,
    movement_type: 'purchase',
    notes: '',
    unit_cost: undefined,
  });

  useEffect(() => {
    if (user?.role) {
      fetchProducts(user.role);
      fetchMovements();
    }
  }, [user?.role, fetchProducts]);

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const response = await window.api.inventory.list(100);
      if (response.success && response.data) {
        setMovements(response.data);
      }
    } catch {
      showNotification('error', 'Failed to load inventory movements');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch = movement.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || movement.movement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openAddStockModal = () => {
    setFormData({
      product_id: products[0]?.id || 0,
      quantity: 0,
      movement_type: 'purchase',
      notes: '',
      unit_cost: undefined,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.product_id) {
      showNotification('error', 'Please select a product');
      return;
    }

    if (!formData.quantity || formData.quantity === 0) {
      showNotification('error', 'Please enter a valid quantity');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await window.api.inventory.create(formData, user!.id);
      if (response.success && response.data) {
        // Refresh movements list
        await fetchMovements();
        // Refresh products to get updated stock
        await fetchProducts(user!.role);
        showNotification('success', 'Stock updated successfully');
        setShowModal(false);
      } else {
        showNotification('error', response.error || 'Failed to update stock');
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMovementTypeColor = (type: InventoryMovementType) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'sale':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'return':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'initial':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const columns = [
    {
      key: 'created_at',
      header: 'Date',
      render: (movement: InventoryMovement) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(movement.created_at)}
        </span>
      ),
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (movement: InventoryMovement) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {movement.product_name}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (movement: InventoryMovement) => (
        <span className={`font-medium ${movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
        </span>
      ),
    },
    {
      key: 'movement_type',
      header: 'Type',
      render: (movement: InventoryMovement) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getMovementTypeColor(movement.movement_type)}`}>
          {movement.movement_type}
        </span>
      ),
    },
    {
      key: 'unit_cost',
      header: 'Unit Cost',
      render: (movement: InventoryMovement) => (
        <span className="text-gray-600 dark:text-gray-400">
          {movement.unit_cost != null ? movement.unit_cost.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (movement: InventoryMovement) => (
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
          {movement.notes || '-'}
        </span>
      ),
    },
    {
      key: 'created_by_username',
      header: 'By',
      render: (movement: InventoryMovement) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {movement.created_by_username}
        </span>
      ),
    },
  ];

  // Calculate summary stats
  const totalIn = movements.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0);
  const totalOut = movements.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800 rounded-xl p-4">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Stock In</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">+{totalIn.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Stock Out</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">-{totalOut.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Recent Movements</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{movements.length}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
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
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as InventoryMovementType | 'all')}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="adjustment">Adjustment</option>
            <option value="return">Return</option>
            <option value="initial">Initial</option>
          </select>
        </div>

        <Button
          onClick={openAddStockModal}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add Stock
        </Button>
      </div>

      {/* Movements Table */}
      <Table
        columns={columns}
        data={filteredMovements}
        keyExtractor={(movement) => movement.id}
        isLoading={isLoading}
        emptyMessage="No inventory movements recorded"
      />

      {/* Add Stock Drawer */}
      <Drawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Stock"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              Add Stock
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Product"
            options={products.map((p) => ({
              value: p.id,
              label: `${p.name} (Current: ${p.stock_qty})`,
            }))}
            value={formData.product_id}
            onChange={(e) => setFormData({ ...formData, product_id: Number(e.target.value) })}
          />

          <Select
            label="Movement Type"
            options={MOVEMENT_TYPES}
            value={formData.movement_type}
            onChange={(e) => setFormData({ ...formData, movement_type: e.target.value as InventoryMovementType })}
          />

          <Input
            label="Quantity"
            type="number"
            value={formData.quantity || ''}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            placeholder="Enter quantity (positive to add, negative to remove)"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            Enter a positive number to add stock, or negative to remove stock.
          </p>

          <Input
            label="Unit Cost (Optional)"
            type="number"
            step="0.01"
            value={formData.unit_cost || ''}
            onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="Cost per unit"
          />

          <TextArea
            label="Notes (Optional)"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any notes about this stock change"
            rows={3}
          />
        </div>
      </Drawer>
    </div>
  );
}
