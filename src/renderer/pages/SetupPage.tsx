import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';

export function SetupPage() {
  const navigate = useNavigate();
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkRecoveryKey();
  }, []);

  const checkRecoveryKey = async () => {
    try {
      const response = await window.api.recovery.exists();
      if (response.success && response.data) {
        // Recovery key already exists, redirect to login
        navigate('/login', { replace: true });
        return;
      }
      // Generate new recovery key
      const setupResponse = await window.api.recovery.setup();
      if (setupResponse.success && setupResponse.data) {
        setRecoveryKey(setupResponse.data);
      } else {
        setError(setupResponse.error || 'Failed to generate recovery key');
      }
    } catch (err) {
      setError('Failed to initialize setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (recoveryKey) {
      await navigator.clipboard.writeText(recoveryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinue = () => {
    if (confirmed) {
      navigate('/login', { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card padding="lg" className="max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Setup Error</h2>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-3xl">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Bigtal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Initial Setup</p>
        </div>

        <Card padding="lg">
          {/* Warning Banner */}
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">Important - Save This Key</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  This is your recovery key. You will need it to reset the admin password if you ever forget it.
                  Store it in a safe place. This key cannot be recovered once you leave this page.
                </p>
              </div>
            </div>
          </div>

          {/* Recovery Key Display */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Recovery Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 font-mono text-lg text-center tracking-widest select-all dark:text-white">
                {recoveryKey}
              </div>
              <Button
                variant="secondary"
                onClick={handleCopy}
                className="flex-shrink-0"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </Button>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I have saved my recovery key in a secure location and understand that it cannot be recovered
              </span>
            </label>
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            className="w-full"
            size="lg"
            disabled={!confirmed}
          >
            Continue to Login
          </Button>
        </Card>
      </div>
    </div>
  );
}
