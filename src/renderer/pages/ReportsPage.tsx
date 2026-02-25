import React, { useState, useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useDataStore } from '../store/dataStore';
import { Card, Button, Input } from '../components/ui';
import type { SalesReportData, InventoryReportData, TradingPLData, BalanceSheetData } from '../../shared/types';

type ReportTab = 'sales' | 'inventory' | 'pl' | 'balance';

export function ReportsPage() {
  const { showNotification } = useUIStore();
  const { currencies, fetchCurrencies } = useDataStore();

  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Date range (default: current month)
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(lastDayOfMonth);

  // Report data
  const [salesReport, setSalesReport] = useState<SalesReportData | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryReportData | null>(null);
  const [plReport, setPLReport] = useState<TradingPLData | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);

  const defaultCurrency = currencies.find((c) => c.code === 'UGX') || currencies[0];

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'sales': {
          const response = await window.api.reports.sales(startDate, endDate);
          if (response.success && response.data) {
            setSalesReport(response.data);
          }
          break;
        }
        case 'inventory': {
          const response = await window.api.reports.inventory();
          if (response.success && response.data) {
            setInventoryReport(response.data);
          }
          break;
        }
        case 'pl': {
          const response = await window.api.reports.tradingPL(startDate, endDate);
          if (response.success && response.data) {
            setPLReport(response.data);
          }
          break;
        }
        case 'balance': {
          const response = await window.api.reports.balanceSheet(endDate);
          if (response.success && response.data) {
            setBalanceSheet(response.data);
          }
          break;
        }
      }
    } catch {
      showNotification('error', 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let data: Record<string, unknown>[] = [];
      let columns: { key: string; header: string }[] = [];
      let filename = '';

      switch (activeTab) {
        case 'sales':
          if (salesReport) {
            data = salesReport.topProducts.map((p) => ({
              product: p.name,
              quantity: p.quantity,
              revenue: p.revenue,
            }));
            columns = [
              { key: 'product', header: 'Product' },
              { key: 'quantity', header: 'Quantity Sold' },
              { key: 'revenue', header: 'Revenue' },
            ];
            filename = `sales-report-${startDate}-to-${endDate}.csv`;
          }
          break;
        case 'inventory':
          if (inventoryReport) {
            data = inventoryReport.lowStockItems.map((item) => ({
              id: item.id,
              name: item.name,
              stock_qty: item.stock_qty,
              buy_price: item.buy_price,
            }));
            columns = [
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Product' },
              { key: 'stock_qty', header: 'Stock Qty' },
              { key: 'buy_price', header: 'Buy Price' },
            ];
            filename = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
          }
          break;
        case 'pl':
          if (plReport) {
            data = [
              { item: 'Revenue', amount: plReport.revenue },
              { item: 'Cost of Goods Sold', amount: plReport.costOfGoodsSold },
              { item: 'Gross Profit', amount: plReport.grossProfit },
              { item: 'Gross Margin %', amount: plReport.grossMargin.toFixed(2) },
              { item: 'Operating Expenses', amount: plReport.expenses },
              { item: 'Net Profit', amount: plReport.netProfit },
              { item: 'Net Margin %', amount: plReport.netMargin.toFixed(2) },
            ];
            columns = [
              { key: 'item', header: 'Item' },
              { key: 'amount', header: 'Amount' },
            ];
            filename = `profit-loss-${startDate}-to-${endDate}.csv`;
          }
          break;
        case 'balance':
          if (balanceSheet) {
            data = [
              { item: 'Inventory', amount: balanceSheet.assets.inventory },
              { item: 'Receivables', amount: balanceSheet.assets.receivables },
              { item: 'Cash', amount: balanceSheet.assets.cash },
              { item: 'Total Assets', amount: balanceSheet.assets.total },
              { item: 'Equity', amount: balanceSheet.equity },
            ];
            columns = [
              { key: 'item', header: 'Item' },
              { key: 'amount', header: 'Amount' },
            ];
            filename = `balance-sheet-${balanceSheet.asOfDate}.csv`;
          }
          break;
      }

      if (data.length > 0) {
        const response = await window.api.export.csv(data, columns, filename);
        if (response.success) {
          showNotification('success', 'Report exported successfully');
        } else if (response.error !== 'Export cancelled') {
          showNotification('error', response.error || 'Export failed');
        }
      }
    } catch {
      showNotification('error', 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    // Ensure amount is a number (defensive against string serialization from IPC)
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    const safeAmount = isNaN(numAmount) ? 0 : numAmount;
    return `${defaultCurrency?.symbol || ''} ${safeAmount.toLocaleString()}`;
  };

  const tabs = [
    { id: 'sales', label: 'Sales Summary' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'pl', label: 'Profit & Loss' },
    { id: 'balance', label: 'Balance Sheet' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportTab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range & Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <span className="text-gray-500">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button
          variant="secondary"
          onClick={handleExportCSV}
          isLoading={isExporting}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          Export CSV
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      )}

      {/* Sales Report */}
      {!isLoading && activeTab === 'sales' && salesReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(salesReport.totalRevenue)}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {salesReport.totalTransactions}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(salesReport.averageOrderValue)}
              </p>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Top Products</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="pb-2">Product</th>
                    <th className="pb-2 text-right">Quantity</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReport.topProducts.map((product, index) => (
                    <tr key={index} className="border-b dark:border-gray-700 last:border-0">
                      <td className="py-2 text-gray-900 dark:text-white">{product.name}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">{product.quantity}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(product.revenue)}
                      </td>
                    </tr>
                  ))}
                  {salesReport.topProducts.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500 dark:text-gray-400">
                        No sales data for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Customers */}
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Top Customers</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-right">Transactions</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReport.topCustomers.map((customer, index) => (
                    <tr key={index} className="border-b dark:border-gray-700 last:border-0">
                      <td className="py-2 text-gray-900 dark:text-white">{customer.name}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">{customer.transactions}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(customer.revenue)}
                      </td>
                    </tr>
                  ))}
                  {salesReport.topCustomers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500 dark:text-gray-400">
                        No customer data for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Inventory Report */}
      {!isLoading && activeTab === 'inventory' && inventoryReport && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(inventoryReport.totalValue)}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {inventoryReport.totalItems}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {inventoryReport.lowStockItems.length}
              </p>
            </Card>
          </div>

          {/* Low Stock Items */}
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Low Stock Items</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="pb-2">Product</th>
                    <th className="pb-2 text-right">Stock Qty</th>
                    <th className="pb-2 text-right">Unit Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport.lowStockItems.map((item) => (
                    <tr key={item.id} className="border-b dark:border-gray-700 last:border-0">
                      <td className="py-2 text-gray-900 dark:text-white">{item.name}</td>
                      <td className="py-2 text-right text-red-600 dark:text-red-400 font-medium">
                        {item.stock_qty}
                      </td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(item.buy_price)}
                      </td>
                    </tr>
                  ))}
                  {inventoryReport.lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500 dark:text-gray-400">
                        All items have sufficient stock
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Stock by Category */}
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Stock by Category</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Items</th>
                    <th className="pb-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport.stockByCategory.map((cat, index) => (
                    <tr key={index} className="border-b dark:border-gray-700 last:border-0">
                      <td className="py-2 text-gray-900 dark:text-white">{cat.category}</td>
                      <td className="py-2 text-right text-gray-600 dark:text-gray-400">{cat.items}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(cat.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Profit & Loss Report */}
      {!isLoading && activeTab === 'pl' && plReport && (
        <div className="space-y-6">
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Trading Profit & Loss Statement</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {startDate} to {endDate}
            </p>
            <div className="space-y-4">
              {/* Revenue */}
              <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Revenue (Sales)</span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(plReport.revenue)}</span>
              </div>

              {/* COGS */}
              <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Less: Cost of Goods Sold</span>
                <span className="font-medium text-red-600 dark:text-red-400">({formatCurrency(plReport.costOfGoodsSold)})</span>
              </div>

              {/* Gross Profit */}
              <div className="flex justify-between items-center py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 -mx-4 px-4">
                <span className="font-semibold text-gray-900 dark:text-white">Gross Profit</span>
                <div className="text-right">
                  <span className={`font-bold ${plReport.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(plReport.grossProfit)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    ({plReport.grossMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Expenses */}
              <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Less: Operating Expenses</span>
                <span className="font-medium text-red-600 dark:text-red-400">({formatCurrency(plReport.expenses)})</span>
              </div>

              {/* Net Profit */}
              <div className="flex justify-between items-center py-3 bg-primary-50 dark:bg-primary-900/30 -mx-4 px-4 rounded-lg">
                <span className="font-bold text-gray-900 dark:text-white">Net Profit / (Loss)</span>
                <div className="text-right">
                  <span className={`font-bold text-lg ${plReport.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(plReport.netProfit)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    ({plReport.netMargin.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Expenses by Category */}
          {plReport.expensesByCategory.length > 0 && (
            <Card>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Expenses by Category</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                      <th className="pb-2">Category</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plReport.expensesByCategory.map((cat, index) => (
                      <tr key={index} className="border-b dark:border-gray-700 last:border-0">
                        <td className="py-2 text-gray-900 dark:text-white">{cat.category}</td>
                        <td className="py-2 text-right text-red-600 dark:text-red-400 font-medium">
                          {formatCurrency(cat.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Balance Sheet */}
      {!isLoading && activeTab === 'balance' && balanceSheet && (() => {
        // Recalculate totals on frontend to ensure numeric addition (defensive against string serialization)
        const inventory = Number(balanceSheet.assets.inventory) || 0;
        const receivables = Number(balanceSheet.assets.receivables) || 0;
        const cash = Number(balanceSheet.assets.cash) || 0;
        const totalAssets = inventory + receivables + cash;
        const equity = totalAssets;

        return (
        <div className="space-y-6">
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Balance Sheet</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              As of {balanceSheet.asOfDate}
            </p>
            <div className="space-y-6">
              {/* Assets */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-3 uppercase text-sm tracking-wide">Assets</h5>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 dark:text-gray-400">Inventory</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(inventory)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 dark:text-gray-400">Accounts Receivable</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(receivables)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 dark:text-gray-400">Cash</span>
                    <span className={`${cash >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(cash)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 mt-2 border-t dark:border-gray-700 font-semibold">
                  <span className="text-gray-900 dark:text-white">Total Assets</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(totalAssets)}</span>
                </div>
              </div>

              {/* Equity */}
              <div className="pt-4 border-t dark:border-gray-700">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3 uppercase text-sm tracking-wide">Equity</h5>
                <div className="flex justify-between items-center py-2 font-semibold bg-primary-50 dark:bg-primary-900/30 -mx-4 px-4 rounded-lg">
                  <span className="text-gray-900 dark:text-white">Owner's Equity</span>
                  <span className={`${equity >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(equity)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Note:</strong> This is a simplified balance sheet. It shows assets (inventory, receivables, and cash) against equity.
              Cash is calculated as total paid invoices minus total expenses up to the selected date.
            </p>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
