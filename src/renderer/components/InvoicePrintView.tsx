import React from 'react';
import type { InvoiceWithItems, BusinessInfo } from '../../shared/types';

interface BusinessInfoForPrint extends BusinessInfo {
  logoDataUrl?: string | null;
}

interface InvoicePrintViewProps {
  invoice: InvoiceWithItems;
  businessInfo?: BusinessInfoForPrint | null;
}

// Inline SVG logo for print compatibility
function PrintLogo({ size = 'normal' }: { size?: 'normal' | 'small' }) {
  const sizeClass = size === 'small' ? 'w-4 h-4' : 'w-12 h-12';
  return (
    <svg
      className={sizeClass}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="printBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="url(#printBgGradient)" />
      <g fill="white">
        <path d="M160 96h120c44.183 0 80 35.817 80 80 0 26.5-12.9 50-32.7 64.7C355.6 254.8 376 290.4 376 330c0 47.5-38.5 86-86 86H160V96zm60 60v80h60c22.091 0 40-17.909 40-40s-17.909-40-40-40h-60zm0 140v66h70c18.225 0 33-14.775 33-33s-14.775-33-33-33h-70z" />
      </g>
      <rect x="376" y="280" width="40" height="136" rx="8" fill="#F59E0B" />
      <rect x="316" y="320" width="40" height="96" rx="8" fill="#F59E0B" opacity="0.7" />
    </svg>
  );
}

export function InvoicePrintView({ invoice, businessInfo }: InvoicePrintViewProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const subtotal = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  // Determine what to show in header
  const hasBusinessInfo = businessInfo && businessInfo.name;
  const businessName = hasBusinessInfo ? businessInfo.name : 'Bigtal';
  const showBusinessLogo = hasBusinessInfo && businessInfo.logoDataUrl;

  return (
    <div className="print-view bg-white p-8 max-w-3xl mx-auto relative">
      {/* PAID Watermark */}
      {invoice.status === 'paid' && (
        <div
          className="paid-watermark absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          aria-hidden="true"
        >
          <span
            className="text-green-500 font-bold uppercase select-none"
            style={{
              fontSize: '8rem',
              opacity: 0.12,
              transform: 'rotate(-30deg)',
              letterSpacing: '0.1em',
            }}
          >
            PAID
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200">
        <div className="flex items-center gap-3">
          {showBusinessLogo ? (
            <img
              src={businessInfo.logoDataUrl!}
              alt={businessName}
              className="w-12 h-12 object-contain"
            />
          ) : (
            <PrintLogo />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
            {hasBusinessInfo ? (
              <div className="text-sm text-gray-500 space-y-0.5">
                {businessInfo.address && <p>{businessInfo.address}</p>}
                {businessInfo.phone && <p>{businessInfo.phone}</p>}
                {businessInfo.email && <p>{businessInfo.email}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Small Business Management</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
          <p className="text-lg font-medium text-primary-600 mt-1">
            {invoice.invoice_number}
          </p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Bill To
          </h3>
          <p className="text-lg font-medium text-gray-900">
            {invoice.customer_name}
          </p>
          {invoice.customer_phone && (
            <p className="text-gray-600">{invoice.customer_phone}</p>
          )}
          {invoice.customer_email && (
            <p className="text-gray-600">{invoice.customer_email}</p>
          )}
        </div>
        <div className="text-right">
          <div className="space-y-1">
            <div className="flex justify-end gap-4">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="font-medium text-gray-900">{formatDate(invoice.created_at)}</span>
            </div>
            {invoice.due_date && (
              <div className="flex justify-end gap-4">
                <span className="text-sm text-gray-500">Due Date:</span>
                <span className="font-medium text-gray-900">{formatDate(invoice.due_date)}</span>
              </div>
            )}
            <div className="flex justify-end gap-4">
              <span className="text-sm text-gray-500">Status:</span>
              <span
                className={`font-medium capitalize ${
                  invoice.status === 'paid'
                    ? 'text-green-600'
                    : invoice.status === 'overdue'
                    ? 'text-red-600'
                    : 'text-gray-900'
                }`}
              >
                {invoice.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
              Item
            </th>
            <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
              Qty
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
              Unit Price
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-900">{item.product_name}</td>
              <td className="py-3 px-4 text-center text-gray-600">
                {item.quantity}
              </td>
              <td className="py-3 px-4 text-right text-gray-600">
                {invoice.currency_symbol} {item.unit_price.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right font-medium text-gray-900">
                {invoice.currency_symbol}{' '}
                {(item.quantity * item.unit_price).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">
              {invoice.currency_symbol} {subtotal.toLocaleString()}
            </span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between py-2 text-red-600">
              <span>Discount</span>
              <span>
                -{invoice.currency_symbol} {invoice.discount_amount.toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between py-3 border-t-2 border-gray-900">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">
              {invoice.currency_symbol} {invoice.total_amount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
            Notes
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <p className="mb-3">Thank you for your business!</p>
        <div className="flex items-center justify-center gap-2">
          <PrintLogo size="small" />
          <span>Generated by Bigtal - Small Business Management</span>
        </div>
      </div>
    </div>
  );
}
