import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button, Input, Card, Modal, Logo } from '../components/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'key' | 'password'>('key');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await login(username, password);
    if (success) {
      navigate('/', { replace: true });
    }
  };

  const openRecoveryModal = () => {
    setShowRecoveryModal(true);
    setRecoveryKey('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryStep('key');
    setRecoveryError(null);
    setRecoverySuccess(false);
  };

  const closeRecoveryModal = () => {
    setShowRecoveryModal(false);
    setRecoveryError(null);
  };

  const handleValidateKey = async () => {
    if (!recoveryKey.trim()) {
      setRecoveryError('Please enter your recovery key');
      return;
    }

    setIsRecovering(true);
    setRecoveryError(null);

    try {
      const response = await window.api.recovery.validate(recoveryKey.trim());
      if (response.success && response.data) {
        setRecoveryStep('password');
      } else {
        setRecoveryError('Invalid recovery key');
      }
    } catch {
      setRecoveryError('Failed to validate recovery key');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 4) {
      setRecoveryError('Password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRecoveryError('Passwords do not match');
      return;
    }

    setIsRecovering(true);
    setRecoveryError(null);

    try {
      const response = await window.api.recovery.resetAdmin(recoveryKey.trim(), newPassword);
      if (response.success) {
        setRecoverySuccess(true);
      } else {
        setRecoveryError(response.error || 'Failed to reset password');
      }
    } catch {
      setRecoveryError('Failed to reset password');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Bigtal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to manage your business</p>
        </div>

        {/* Login Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={openRecoveryModal}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Forgot admin password?
            </button>
          </div>
        </Card>

        {/* Recovery Modal */}
        <Modal
          isOpen={showRecoveryModal}
          onClose={closeRecoveryModal}
          title={recoverySuccess ? 'Password Reset' : 'Reset Admin Password'}
          size="sm"
          footer={
            recoverySuccess ? (
              <Button onClick={closeRecoveryModal}>
                Continue to Login
              </Button>
            ) : recoveryStep === 'key' ? (
              <>
                <Button variant="secondary" onClick={closeRecoveryModal}>
                  Cancel
                </Button>
                <Button onClick={handleValidateKey} isLoading={isRecovering}>
                  Validate Key
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setRecoveryStep('key')}>
                  Back
                </Button>
                <Button onClick={handleResetPassword} isLoading={isRecovering}>
                  Reset Password
                </Button>
              </>
            )
          }
        >
          {recoverySuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Admin password has been reset successfully. You can now log in with your new password.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recoveryError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                  {recoveryError}
                </div>
              )}

              {recoveryStep === 'key' ? (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Enter the recovery key you saved during initial setup to reset the admin password.
                  </p>
                  <Input
                    label="Recovery Key"
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                    placeholder="Enter your recovery key"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enter a new password for the admin account.
                  </p>
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoFocus
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-8">
          Bigtal - Small Business Management
        </p>
      </div>
    </div>
  );
}
