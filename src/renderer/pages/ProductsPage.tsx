import React, { useEffect, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Table, Button, Drawer, Input, Select, Card, Modal } from '../components/ui';
import type { Product, CreateProductDTO, ProductType } from '../../shared/types';
import { PRODUCT_TYPES } from '../../shared/constants';

export function ProductsPage() {
  const { user } = useAuthStore();
  const {
    products,
    categories,
    currencies,
    suppliers,
    isLoadingProducts,
    fetchProducts,
    fetchSuppliers,
    fetchCategories,
    addProduct,
    updateProduct,
    removeProduct,
    addCategory,
  } = useDataStore();
  const { showNotification } = useUIStore();

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Category creation modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateProductDTO>({
    name: '',
    type: 'sell',
    category_id: undefined,
    sell_price: undefined,
    buy_price: undefined,
    currency_id: 1,
    stock_qty: 0,
    supplier_id: undefined,
  });

  useEffect(() => {
    if (user?.role) {
      fetchProducts(user.role);
      fetchSuppliers();
    }
  }, [user?.role, fetchProducts, fetchSuppliers]);

  useEffect(() => {
    // Set default currency
    const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];
    if (defaultCurrency && !editingProduct) {
      setFormData((prev) => ({ ...prev, currency_id: defaultCurrency.id }));
    }
  }, [currencies, editingProduct]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];
    setFormData({
      name: '',
      type: 'sell',
      category_id: undefined,
      sell_price: undefined,
      buy_price: undefined,
      currency_id: defaultCurrency?.id || 1,
      stock_qty: 0,
      supplier_id: undefined,
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      type: product.type,
      category_id: product.category_id,
      sell_price: product.sell_price,
      buy_price: product.buy_price,
      currency_id: product.currency_id,
      stock_qty: product.stock_qty,
      supplier_id: product.supplier_id,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showNotification('error', 'Product name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        const response = await window.api.products.update(editingProduct.id, formData, user!.role);
        if (response.success && response.data) {
          updateProduct(response.data);
          showNotification('success', 'Product updated successfully');
          setShowModal(false);
        } else {
          showNotification('error', response.error || 'Failed to update product');
        }
      } else {
        const response = await window.api.products.create(formData, user!.role);
        if (response.success && response.data) {
          addProduct(response.data);
          showNotification('success', 'Product created successfully');
          setShowModal(false);
        } else {
          showNotification('error', response.error || 'Failed to create product');
        }
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      const response = await window.api.products.delete(product.id, user!.role);
      if (response.success) {
        removeProduct(product.id);
        showNotification('success', 'Product deleted');
      } else {
        showNotification('error', response.error || 'Failed to delete product');
      }
    } catch {
      showNotification('error', 'Failed to delete product');
    }
  };

  const handleCategorySelect = (value: string) => {
    if (value === 'new') {
      setShowCategoryModal(true);
    } else {
      setFormData({ ...formData, category_id: value ? Number(value) : undefined });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showNotification('error', 'Category name is required');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const response = await window.api.categories.create({ name: newCategoryName.trim() });
      if (response.success && response.data) {
        addCategory(response.data);
        setFormData({ ...formData, category_id: response.data.id });
        showNotification('success', 'Category created');
        setShowCategoryModal(false);
        setNewCategoryName('');
      } else {
        showNotification('error', response.error || 'Failed to create category');
      }
    } catch {
      showNotification('error', 'Failed to create category');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (product: Product) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{product.category_name || 'Uncategorized'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (product: Product) => (
        <span className="capitalize text-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">{product.type}</span>
      ),
    },
    {
      key: 'sell_price',
      header: 'Sell Price',
      render: (product: Product) =>
        product.sell_price != null
          ? `${product.currency_code} ${product.sell_price.toLocaleString()}`
          : '-',
    },
    {
      key: 'buy_price',
      header: 'Buy Price',
      render: (product: Product) =>
        product.buy_price != null
          ? `${product.currency_code} ${product.buy_price.toLocaleString()}`
          : '-',
    },
    {
      key: 'stock_qty',
      header: 'Stock',
      render: (product: Product) => (
        <span className={product.stock_qty <= 5 ? 'text-red-600 font-medium' : ''}>
          {product.stock_qty}
        </span>
      ),
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      render: (product: Product) => product.supplier_name || '-',
    },
    {
      key: 'actions',
      header: '',
      render: (product: Product) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(product)}
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
            onClick={() => handleDelete(product)}
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={openCreateModal}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add Product
        </Button>
      </div>

      {/* Products Table */}
      <Table
        columns={columns}
        data={filteredProducts}
        keyExtractor={(product) => product.id}
        isLoading={isLoadingProducts}
        emptyMessage="No products found"
      />

      {/* Create/Edit Drawer */}
      <Drawer
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Edit Product' : 'New Product'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Product Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter product name"
            />
          </div>

          <Select
            label="Type"
            options={PRODUCT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as ProductType })}
          />

          <Select
            label="Category"
            options={[
              { value: '', label: 'Select category' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
              { value: 'new', label: '+ Add New Category' },
            ]}
            value={formData.category_id || ''}
            onChange={(e) => handleCategorySelect(e.target.value)}
          />

          <Input
            label="Sell Price"
            type="number"
            step="0.01"
            value={formData.sell_price || ''}
            onChange={(e) => setFormData({ ...formData, sell_price: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="0.00"
          />

          <Input
            label="Buy Price"
            type="number"
            step="0.01"
            value={formData.buy_price || ''}
            onChange={(e) => setFormData({ ...formData, buy_price: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="0.00"
          />

          <Select
            label="Currency"
            options={currencies.map((c) => ({ value: c.id, label: `${c.code} (${c.symbol})` }))}
            value={formData.currency_id}
            onChange={(e) => setFormData({ ...formData, currency_id: Number(e.target.value) })}
          />

          <Input
            label="Stock Quantity"
            type="number"
            value={formData.stock_qty || 0}
            onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
          />

          <div className="col-span-2">
            <Select
              label="Supplier (Optional)"
              options={[
                { value: '', label: 'Select supplier' },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
              value={formData.supplier_id || ''}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>
        </div>
      </Drawer>

      {/* Add Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setNewCategoryName('');
        }}
        title="Add New Category"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Enter category name"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCategoryModal(false);
                setNewCategoryName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCategory} isLoading={isCreatingCategory}>
              Create Category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
