import React, { useState, useEffect } from 'react';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Drawer, Button, Input, Select } from '../ui';
import type { CreateProductDTO, ProductType } from '../../../shared/types';
import { PRODUCT_TYPES } from '../../../shared/constants';

export function ProductDrawer() {
  const { user } = useAuthStore();
  const { currencies, categories, suppliers, fetchSuppliers, addProduct } = useDataStore();
  const { activeDrawer, closeDrawer, showNotification } = useUIStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (activeDrawer === 'product') {
      fetchSuppliers();
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
    }
  }, [activeDrawer, currencies, fetchSuppliers]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showNotification('error', 'Product name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await window.api.products.create(formData, user!.role);
      if (response.success && response.data) {
        addProduct(response.data);
        showNotification('success', 'Product created successfully');
        closeDrawer();
      } else {
        showNotification('error', response.error || 'Failed to create product');
      }
    } catch {
      showNotification('error', 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer
      isOpen={activeDrawer === 'product'}
      onClose={closeDrawer}
      title="New Product"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={closeDrawer}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Create
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
          ]}
          value={formData.category_id || ''}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : undefined })}
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
  );
}
