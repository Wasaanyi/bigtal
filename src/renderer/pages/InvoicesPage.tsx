import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Table, StatusBadge, Button, Modal, Card } from '../components/ui';
import { InvoicePrintView } from '../components/InvoicePrintView';
import type { Invoice, InvoiceStatus, InvoiceWithItems, BusinessInfo } from '../../shared/types';

interface BusinessInfoForPrint extends BusinessInfo {
  logoDataUrl?: string | null;
}

const statusFilters: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
];

export function InvoicesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { invoices, customers, isLoadingInvoices, fetchInvoices, fetchCustomers, updateInvoice } = useDataStore();
  const { showNotification } = useUIStore();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<InvoiceWithItems | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<number | null>(null);
  const [businessInfoForPrint, setBusinessInfoForPrint] = useState<BusinessInfoForPrint | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    if (user?.role) {
      fetchInvoices(user.role);
      fetchCustomers();
    }
    // Check if email is configured
    window.api.email.getConfig().then((res) => {
      setEmailConfigured(res.success && res.data !== null);
    });
  }, [user?.role, fetchInvoices, fetchCustomers]);

  const filteredInvoices = invoices.filter((invoice) => {
    if (statusFilter === 'all') return true;
    return invoice.status === statusFilter;
  });

  // Filter out 'paid' status for attendants
  const availableFilters = user?.role === 'attendant'
    ? statusFilters.filter((f) => f.value !== 'paid')
    : statusFilters;

  const handleMarkAsPaid = async () => {
    if (!selectedInvoice) return;

    setIsUpdating(true);
    try {
      const response = await window.api.invoices.updateStatus(selectedInvoice.id, 'paid');
      if (response.success && response.data) {
        updateInvoice(response.data);
        showNotification('success', 'Invoice marked as paid');
        setSelectedInvoice(null);
      } else {
        showNotification('error', response.error || 'Failed to update invoice');
      }
    } catch {
      showNotification('error', 'Failed to update invoice');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = filteredInvoices.map((inv) => ({
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        status: inv.status,
        currency: inv.currency_code,
        total_amount: inv.total_amount,
        due_date: inv.due_date || '',
        created_at: inv.created_at,
      }));

      const columns = [
        { key: 'invoice_number', header: 'Invoice #' },
        { key: 'customer_name', header: 'Customer' },
        { key: 'status', header: 'Status' },
        { key: 'currency', header: 'Currency' },
        { key: 'total_amount', header: 'Amount' },
        { key: 'due_date', header: 'Due Date' },
        { key: 'created_at', header: 'Created' },
      ];

      const response = await window.api.export.csv(
        exportData,
        columns,
        `invoices-${new Date().toISOString().slice(0, 10)}.csv`
      );

      if (response.success) {
        showNotification('success', 'Invoices exported successfully');
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

  const handlePrint = async (invoice: Invoice) => {
    setPrintingInvoiceId(invoice.id);
    try {
      // Load invoice details and business info in parallel
      const [invoiceResponse, businessResponse] = await Promise.all([
        window.api.invoices.get(invoice.id),
        window.api.business.getInfo(),
      ]);

      if (invoiceResponse.success && invoiceResponse.data) {
        setPrintInvoice(invoiceResponse.data);

        // Load business info with logo data URL if available
        let businessInfoWithLogo: BusinessInfoForPrint | null = null;
        if (businessResponse.success && businessResponse.data) {
          businessInfoWithLogo = { ...businessResponse.data };
          if (businessResponse.data.logoPath) {
            const logoResponse = await window.api.business.getLogo(businessResponse.data.logoPath);
            if (logoResponse.success && logoResponse.data) {
              businessInfoWithLogo.logoDataUrl = logoResponse.data;
            }
          }
        }
        setBusinessInfoForPrint(businessInfoWithLogo);
        setShowPreview(true);
      } else {
        showNotification('error', 'Failed to load invoice details');
      }
    } catch {
      showNotification('error', 'Failed to load invoice');
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const handlePreviewPrint = async () => {
    if (!printInvoice) return;
    setIsSavingPdf(true);
    try {
      const invoiceDate = new Date(printInvoice.created_at).toISOString().slice(0, 10);
      const filename = `invoice-${invoiceDate}-${printInvoice.invoice_number}.pdf`;
      const response = await window.api.print.savePdf(filename);
      if (response.success) {
        showNotification('success', 'Invoice saved as PDF');
        handlePreviewClose();
      } else if (response.error !== 'Export cancelled') {
        showNotification('error', response.error || 'Failed to save PDF');
      }
    } catch {
      showNotification('error', 'Failed to save PDF');
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!printInvoice) return;
    const customer = customers.find((c) => c.id === printInvoice.customer_id);
    if (!customer?.email) {
      showNotification('error', 'Customer does not have an email address');
      return;
    }
    setIsSendingEmail(true);
    try {
      const response = await window.api.email.sendInvoicePdf(printInvoice.id, customer.email);
      if (response.success) {
        showNotification('success', `Invoice sent to ${customer.email}`);
        // Mark as sent if currently draft
        if (printInvoice.status === 'draft') {
          const statusResponse = await window.api.invoices.updateStatus(printInvoice.id, 'sent');
          if (statusResponse.success && statusResponse.data) {
            updateInvoice(statusResponse.data);
          }
        }
        handlePreviewClose();
      } else {
        showNotification('error', response.error || 'Failed to send email');
      }
    } catch {
      showNotification('error', 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setPrintInvoice(null);
    setBusinessInfoForPrint(null);
  };

  const columns = [
    {
      key: 'status',
      header: 'Status',
      render: (invoice: Invoice) => <StatusBadge status={invoice.status} />,
    },
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (invoice: Invoice) => (
        <span className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</span>
      ),
    },
    {
      key: 'customer_name',
      header: 'Customer',
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (invoice: Invoice) => invoice.currency_code,
    },
    {
      key: 'total_amount',
      header: 'Amount',
      render: (invoice: Invoice) => (
        <span className="font-medium">
          {invoice.currency_symbol} {invoice.total_amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (invoice: Invoice) =>
        invoice.due_date ? formatDate(invoice.due_date) : '-',
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (invoice: Invoice) => formatDate(invoice.created_at),
    },
    {
      key: 'actions',
      header: '',
      render: (invoice: Invoice) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handlePrint(invoice);
            }}
            disabled={printingInvoiceId !== null}
            leftIcon={
              printingInvoiceId === invoice.id ? undefined : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )
            }
          >
            {printingInvoiceId === invoice.id ? 'Loading...' : 'View'}
          </Button>
          {invoice.status !== 'paid' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedInvoice(invoice);
              }}
            >
              Mark Paid
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6 print:hidden">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {availableFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-colors
                  ${statusFilter === filter.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }
                `}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
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
            <Link to="/invoices/new">
              <Button
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                New Invoice
              </Button>
            </Link>
          </div>
        </div>

        {/* Invoice Table */}
        <Table
          columns={columns}
          data={filteredInvoices}
          keyExtractor={(invoice) => invoice.id}
          isLoading={isLoadingInvoices}
          emptyMessage="No invoices found"
        />

        {/* Mark as Paid Modal */}
        <Modal
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title="Mark Invoice as Paid"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                Cancel
              </Button>
              <Button onClick={handleMarkAsPaid} isLoading={isUpdating}>
                Confirm Payment
              </Button>
            </>
          }
        >
          {selectedInvoice && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to mark this invoice as paid?
              </p>
              <Card padding="sm" className="bg-gray-50 dark:bg-gray-700">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500 dark:text-gray-400">Invoice:</div>
                  <div className="font-medium dark:text-white">{selectedInvoice.invoice_number}</div>
                  <div className="text-gray-500 dark:text-gray-400">Customer:</div>
                  <div className="font-medium dark:text-white">{selectedInvoice.customer_name}</div>
                  <div className="text-gray-500 dark:text-gray-400">Amount:</div>
                  <div className="font-medium dark:text-white">
                    {selectedInvoice.currency_symbol} {selectedInvoice.total_amount.toLocaleString()}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </Modal>
      </div>

      {/* Print Preview Overlay - screen only */}
      {showPreview && printInvoice && (
        <div className="fixed inset-0 z-50 print:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gray-500/70 dark:bg-gray-900/80" />

          {/* Preview controls bar */}
          <div className="relative z-10 flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview: {printInvoice.invoice_number}
            </h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handlePreviewClose}>
                Close
              </Button>
              {printInvoice.status !== 'paid' && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const editData = {
                      customer_id: printInvoice.customer_id,
                      customer_name: printInvoice.customer_name,
                      currency_id: printInvoice.currency_id,
                      currency_code: printInvoice.currency_code,
                      currency_symbol: printInvoice.currency_symbol,
                      invoiceDate: new Date(printInvoice.created_at).toISOString().slice(0, 10),
                      dueDate: new Date(printInvoice.due_date).toISOString().slice(0, 10) || '',
                      items: printInvoice.items.map((item) => ({
                        product_id: item.product_id,
                        product_name: item.product_name,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                      })),
                    };
                    handlePreviewClose();
                    navigate('/invoices/new', { state: { prefill: editData } });
                  }}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  }
                >
                  Edit
                </Button>
              )}
              <Button
                onClick={handlePreviewPrint}
                isLoading={isSavingPdf}
                leftIcon={
                  !isSavingPdf ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : undefined
                }
              >
                Save PDF
              </Button>
              {emailConfigured && (() => {
                const customer = customers.find((c) => c.id === printInvoice.customer_id);
                return customer?.email ? (
                  <Button
                    onClick={handleSendEmail}
                    isLoading={isSendingEmail}
                    leftIcon={
                      !isSendingEmail ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : undefined
                    }
                  >
                    {printInvoice.status === 'sent' || printInvoice.status === 'paid'
                      ? `Resend to ${customer.email}`
                      : `Send to ${customer.email}`}
                  </Button>
                ) : null;
              })()}
            </div>
          </div>

          {/* Scrollable preview area */}
          <div className="relative z-10 overflow-auto h-[calc(100vh-57px)] py-8 flex justify-center">
            <div className="bg-white shadow-xl rounded-lg mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
              <InvoicePrintView invoice={printInvoice} businessInfo={businessInfoForPrint} />
            </div>
          </div>
        </div>
      )}

      {/* Hidden print container - only visible during print */}
      {printInvoice && (
        <div className="hidden print:block print-preview-container">
          <InvoicePrintView invoice={printInvoice} businessInfo={businessInfoForPrint} />
        </div>
      )}
    </>
  );
}
