import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Table, Button, Modal, Input, Select } from '../components/ui';
import type { User, UserRole } from '../../shared/types';

export function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { showNotification } = useUIStore();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('attendant');
  const [newEmail, setNewEmail] = useState('');

  // Edit email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editEmail, setEditEmail] = useState('');

  // Reset password form state
  const [resetPassword, setResetPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await window.api.users.list();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch {
      showNotification('error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim()) {
      showNotification('error', 'Username is required');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 4) {
      showNotification('error', 'Password must be at least 4 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await window.api.users.create(newUsername.trim(), newPassword, newRole, newEmail.trim() || undefined);
      if (response.success && response.data) {
        setUsers([response.data, ...users]);
        showNotification('success', 'User created successfully');
        setShowCreateModal(false);
        setNewUsername('');
        setNewPassword('');
        setNewRole('attendant');
        setNewEmail('');
      } else {
        showNotification('error', response.error || 'Failed to create user');
      }
    } catch {
      showNotification('error', 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!resetPassword.trim() || resetPassword.length < 4) {
      showNotification('error', 'Password must be at least 4 characters');
      return;
    }
    if (resetPassword !== confirmPassword) {
      showNotification('error', 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await window.api.users.updatePassword(selectedUser.id, resetPassword);
      if (response.success) {
        showNotification('success', 'Password reset successfully');
        setShowPasswordModal(false);
        setSelectedUser(null);
        setResetPassword('');
        setConfirmPassword('');
      } else {
        showNotification('error', response.error || 'Failed to reset password');
      }
    } catch {
      showNotification('error', 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!currentUser) return;

    if (user.id === currentUser.id) {
      showNotification('error', 'Cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) return;

    try {
      const response = await window.api.users.delete(user.id, currentUser.id);
      if (response.success) {
        setUsers(users.filter((u) => u.id !== user.id));
        showNotification('success', 'User deleted');
      } else {
        showNotification('error', response.error || 'Failed to delete user');
      }
    } catch {
      showNotification('error', 'Failed to delete user');
    }
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setResetPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const openEmailModal = (user: User) => {
    setSelectedUser(user);
    setEditEmail(user.email || '');
    setShowEmailModal(true);
  };

  const handleUpdateEmail = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const response = await window.api.users.updateEmail(selectedUser.id, editEmail.trim() || null);
      if (response.success) {
        setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, email: editEmail.trim() || undefined } : u)));
        showNotification('success', 'Email updated successfully');
        setShowEmailModal(false);
        setSelectedUser(null);
        setEditEmail('');
      } else {
        showNotification('error', response.error || 'Failed to update email');
      }
    } catch {
      showNotification('error', 'Failed to update email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns = [
    {
      key: 'username',
      header: 'Username',
      render: (user: User) => (
        <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <span
          className={`
            inline-flex px-2 py-1 text-xs font-medium rounded-full
            ${user.role === 'admin' ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}
          `}
        >
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (user: User) => (
        <span className="text-gray-600 dark:text-gray-400">
          {user.email || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (user: User) => formatDate(user.created_at),
    },
    {
      key: 'actions',
      header: '',
      render: (user: User) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEmailModal(user)}
            leftIcon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          >
            Email
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openPasswordModal(user)}
            leftIcon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
          >
            Password
          </Button>
          {user.id !== currentUser?.id && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleDeleteUser(user)}
              leftIcon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Manage user accounts and permissions</p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <Table
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        isLoading={isLoading}
        emptyMessage="No users found"
      />

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} isLoading={isSubmitting}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter username"
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter password (min 4 characters)"
          />
          <Select
            label="Role"
            options={[
              { value: 'attendant', label: 'Attendant' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
          />
          <Input
            label="Email (Optional)"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Enter email for notifications"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Admin users with email will receive sign-out notifications.
          </p>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={`Reset Password for ${selectedUser?.username}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} isLoading={isSubmitting}>
              Reset Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="Enter new password"
            autoFocus
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>
      </Modal>

      {/* Update Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title={`Update Email for ${selectedUser?.username}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEmail} isLoading={isSubmitting}>
              Update Email
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="Enter email address"
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Admin users with email will receive sign-out notifications when any user logs out.
            Leave empty to disable notifications.
          </p>
        </div>
      </Modal>
    </div>
  );
}
