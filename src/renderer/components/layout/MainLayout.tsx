import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useAuthStore } from '../../store/authStore';
import { ExpenseDrawer, ProductDrawer } from '../drawers';

export function MainLayout() {
  const { sidebarCollapsed, notification, clearNotification } = useUIStore();
  const { fetchCurrencies, fetchCategories } = useDataStore();
  const { user } = useAuthStore();

  // Load initial data
  useEffect(() => {
    fetchCurrencies();
    fetchCategories();
  }, [fetchCurrencies, fetchCategories]);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar />

      <div
        className={`h-screen flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>

      {/* Global Drawers */}
      <ExpenseDrawer />
      <ProductDrawer />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`
            fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3
            ${notification.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${notification.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
            ${notification.type === 'info' ? 'bg-blue-600 text-white' : ''}
          `}
        >
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={clearNotification}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
