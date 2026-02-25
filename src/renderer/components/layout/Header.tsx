import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '../ui';
import { useIsAdmin } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useThemeStore } from '../../store/themeStore';
import { PESAPAL_DONATION_URL } from '../../../shared/constants';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/invoices': 'Invoices',
  '/invoices/new': 'New Invoice',
  '/products': 'Products',
  '/expenses': 'Expenses',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/users': 'Users',
  '/settings': 'Settings',
};

export function Header() {
  const location = useLocation();
  const isAdmin = useIsAdmin();
  const { openDrawer } = useUIStore();
  const { theme, toggleTheme } = useThemeStore();
  const title = pageTitles[location.pathname] || 'Bigtal';

  const handleDonate = async () => {
    try {
      const deviceId = localStorage.getItem('device_id') || crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
      await window.api.donations.log(deviceId);
      await window.api.openExternal(PESAPAL_DONATION_URL);
    } catch (error) {
      console.error('Failed to open donation link:', error);
    }
  };

  const getQuickActions = () => {
    switch (location.pathname) {
      case '/':
        return (
          <div className="flex gap-2">
            <Link to="/invoices/new">
              <Button size="sm" leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }>
                New Invoice
              </Button>
            </Link>
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openDrawer('expense')}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  New Expense
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openDrawer('product')}
                >
                  New Product
                </Button>
              </>
            )}
          </div>
        );
      case '/invoices':
        return (
          <Link to="/invoices/new">
            <Button size="sm" leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }>
              New Invoice
            </Button>
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
        {/* Donate Button */}
        <button
          onClick={handleDonate}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 dark:text-accent-400 dark:bg-accent-900/30 dark:hover:bg-accent-900/50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          Donate
        </button>
      </div>
    </header>
  );
}
