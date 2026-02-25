import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDataStore } from '../store/dataStore';
import { useAuthStore, useIsAdmin } from '../store/authStore';
import { StatCard, Card, Button } from '../components/ui';

const currentYear = new Date().getFullYear();

export function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = useIsAdmin();
  const { dashboardStats, isLoadingStats, fetchDashboardStats } = useDataStore();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (user?.role) {
      fetchDashboardStats(user.role, selectedYear);
    }
  }, [user?.role, selectedYear, fetchDashboardStats]);

  const formatCurrency = (amount: number) => {
    if (!dashboardStats?.defaultCurrency) return amount.toLocaleString();
    return `${dashboardStats.defaultCurrency.symbol} ${amount.toLocaleString()}`;
  };

  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Good {getGreeting()}, {user?.username}!
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Here's what's happening with your business today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Today's Income"
          value={formatCurrency(dashboardStats?.todayIncome || 0)}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          colorClass="text-green-600"
        />

        {isAdmin && (
          <StatCard
            title="Today's Expenses"
            value={formatCurrency(dashboardStats?.todayExpenses || 0)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            colorClass="text-red-600"
          />
        )}

        {isAdmin && (
          <StatCard
            title="Cash Balance"
            value={formatCurrency(dashboardStats?.cashBalance || 0)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            }
            colorClass="text-primary-600"
          />
        )}

        <StatCard
          title="Overdue Invoices"
          value={dashboardStats?.overdueInvoices.count || 0}
          subtitle={formatCurrency(dashboardStats?.overdueInvoices.total || 0)}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          colorClass="text-amber-600"
        />
      </div>

      {/* Yearly Summary & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Yearly Summary */}
        {isAdmin && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                disabled={selectedYear <= (dashboardStats?.earliestYear ?? currentYear)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                aria-label="Previous year"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedYear} Summary
              </h3>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                disabled={selectedYear >= currentYear}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                aria-label="Next year"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400">Total Income</p>
                    <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                      {formatCurrency(dashboardStats?.yearlyIncome || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">Total Expenses</p>
                    <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                      {formatCurrency(dashboardStats?.yearlyExpenses || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-primary-600 dark:text-primary-400">Net Profit</p>
                    <p className={`text-lg font-semibold ${(dashboardStats?.yearlyProfit || 0) >= 0 ? 'text-primary-700 dark:text-primary-300' : 'text-red-700 dark:text-red-300'}`}>
                      {formatCurrency(dashboardStats?.yearlyProfit || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Top Products */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products Today</h3>
          {dashboardStats?.topProducts && dashboardStats.topProducts.length > 0 ? (
            <div className="space-y-3">
              {dashboardStats.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{product.quantity} sold</p>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(product.value)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No sales recorded today</p>
              <Link to="/invoices/new">
                <Button variant="secondary" size="sm" className="mt-3">
                  Create your first invoice
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
