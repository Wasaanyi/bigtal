import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Button, Card, Input, Select, Autocomplete, Modal } from '../components/ui';
import type { Customer, Product, Currency, CreateCustomerDTO } from '../../shared/types';

interface InvoiceItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

export function NewInvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { currencies, products, customers, fetchProducts, fetchCustomers, addInvoice, addCustomer } = useDataStore();
  const { showNotification } = useUIStore();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New customer modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (user?.role) {
      fetchProducts(user.role);
      fetchCustomers();
    }
  }, [user?.role, fetchProducts, fetchCustomers]);

  useEffect(() => {
    // Set default currency (UGX)
    const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];
    if (defaultCurrency && !selectedCurrency) {
      setSelectedCurrency(defaultCurrency);
    }
  }, [currencies, selectedCurrency]);

  useEffect(() => {
    if (productSearch.length > 0) {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
        (p.type === 'sell' || p.type === 'both')
      );
      setSearchedProducts(filtered);
    } else {
      setSearchedProducts([]);
    }
  }, [productSearch, products]);

  // Pre-fill from location.state (when editing from preview)
  useEffect(() => {
    const state = location.state as { prefill?: {
      customer_id: number;
      customer_name?: string;
      currency_id: number;
      currency_code?: string;
      currency_symbol?: string;
      invoiceDate: string;
      dueDate: string;
      items: Array<{ product_id: number; product_name?: string; quantity: number; unit_price: number }>;
    } } | null;

    if (!state?.prefill || customers.length === 0 || products.length === 0) return;

    const prefill = state.prefill;
    const customer = customers.find((c) => c.id === prefill.customer_id);
    if (customer) setSelectedCustomer(customer);

    const currency = currencies.find((c) => c.id === prefill.currency_id);
    if (currency) setSelectedCurrency(currency);

    if (prefill.invoiceDate) setInvoiceDate(prefill.invoiceDate);
    if (prefill.dueDate) setDueDate(prefill.dueDate);

    const prefillItems: InvoiceItem[] = [];
    for (const item of prefill.items) {
      const product = products.find((p) => p.id === item.product_id);
      if (product) {
        prefillItems.push({
          product,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      }
    }
    if (prefillItems.length > 0) setItems(prefillItems);

    // Clear location state to prevent re-applying on re-render
    window.history.replaceState({}, document.title);
  }, [location.state, customers, products, currencies]);

  const handleAddItem = (product: Product) => {
    // Check if already added
    if (items.some((item) => item.product.id === product.id)) {
      showNotification('warning', 'Product already added');
      return;
    }

    setItems([
      ...items,
      {
        product,
        quantity: 1,
        unit_price: product.sell_price || 0,
      },
    ]);
    setProductSearch('');
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, quantity);
    setItems(newItems);
  };

  const handleUpdatePrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].unit_price = Math.max(0, price);
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;

    setIsCreatingCustomer(true);
    try {
      const data: CreateCustomerDTO = {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        currency_id: selectedCurrency?.id,
      };

      const response = await window.api.customers.create(data);
      if (response.success && response.data) {
        addCustomer(response.data);
        setSelectedCustomer(response.data);
        setShowNewCustomerModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        showNotification('success', 'Customer created');
      } else {
        showNotification('error', response.error || 'Failed to create customer');
      }
    } catch {
      showNotification('error', 'Failed to create customer');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      showNotification('error', 'Please select a customer');
      return;
    }

    if (!selectedCurrency) {
      showNotification('error', 'Please select a currency');
      return;
    }

    if (items.length === 0) {
      showNotification('error', 'Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await window.api.invoices.create(
        {
          customer_id: selectedCustomer.id,
          currency_id: selectedCurrency.id,
          due_date: dueDate || undefined,
          created_at: invoiceDate || undefined,
          items: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        },
        user!.id
      );

      if (response.success && response.data) {
        addInvoice(response.data);
        showNotification('success', 'Invoice created successfully');
        navigate('/invoices');
      } else {
        showNotification('error', response.error || 'Failed to create invoice');
      }
    } catch {
      showNotification('error', 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.name,
    subtitle: c.phone || c.email,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step 1: Customer & Currency */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Autocomplete
            label="Customer"
            placeholder="Search or create customer..."
            options={customerOptions}
            value={selectedCustomer ? { id: selectedCustomer.id, label: selectedCustomer.name } : null}
            onChange={(option) => {
              const customer = customers.find((c) => c.id === option?.id);
              setSelectedCustomer(customer || null);
            }}
            onCreateNew={(name) => {
              setNewCustomerName(name);
              setShowNewCustomerModal(true);
            }}
            createNewLabel="Create customer"
          />

          <Select
            label="Currency"
            options={currencies.map((c) => ({ value: c.id, label: `${c.code} (${c.symbol})` }))}
            value={selectedCurrency?.id || ''}
            onChange={(e) => {
              const currency = currencies.find((c) => c.id === Number(e.target.value));
              setSelectedCurrency(currency || null);
            }}
          />

          <Input
            label="Invoice Date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />

          <Input
            label="Due Date (Optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </Card>

      {/* Step 2: Line Items */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Items</h3>

        {/* Product Search */}
        <div className="relative mb-4">
          <Input
            placeholder="Search products to add..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          {searchedProducts.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
              {searchedProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleAddItem(product)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {product.category_name} - Stock: {product.stock_qty}
                    </p>
                  </div>
                  <p className="font-medium text-primary-600 dark:text-primary-400">
                    {selectedCurrency?.symbol} {(product.sell_price || 0).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        {items.length > 0 ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-24">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">Total</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map((item, index) => (
                  <tr key={item.product.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{item.product.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium dark:text-white">
                      {selectedCurrency?.symbol} {(item.quantity * item.unit_price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-primary-600 dark:text-primary-400">
                    {selectedCurrency?.symbol} {total.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p>No items added yet</p>
            <p className="text-sm mt-1">Search for products above to add them</p>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate('/invoices')}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!selectedCustomer || !selectedCurrency || items.length === 0}
        >
          Create Invoice
        </Button>
      </div>

      {/* New Customer Modal */}
      <Modal
        isOpen={showNewCustomerModal}
        onClose={() => setShowNewCustomerModal(false)}
        title="Create New Customer"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewCustomerModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} isLoading={isCreatingCustomer}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Customer Name"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            placeholder="Enter customer name"
            autoFocus
          />
          <Input
            label="Phone (Optional)"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value)}
            placeholder="Enter phone number"
          />
        </div>
      </Modal>
    </div>
  );
}
