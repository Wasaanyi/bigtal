import React, { useEffect, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { Card, Button, Input, Select } from '../components/ui';
import type { BusinessInfo } from '../../shared/types';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

const defaultConfig: EmailConfig = {
  host: '',
  port: 587,
  secure: false,
  user: '',
  password: '',
  fromName: 'Bigtal',
  fromEmail: '',
};

const defaultBusinessInfo: BusinessInfo = {
  name: '',
  address: '',
  phone: '',
  email: '',
  logoPath: '',
};

export function SettingsPage() {
  const { showNotification } = useUIStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [config, setConfig] = useState<EmailConfig>(defaultConfig);

  // Business Info state
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(defaultBusinessInfo);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Database backup state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    setIsLoading(true);
    try {
      // Load email config
      const emailResponse = await window.api.email.getConfig();
      if (emailResponse.success && emailResponse.data) {
        setConfig(emailResponse.data);
      }

      // Load business info
      const businessResponse = await window.api.business.getInfo();
      if (businessResponse.success && businessResponse.data) {
        setBusinessInfo(businessResponse.data);
        // Load logo preview if logoPath exists
        if (businessResponse.data.logoPath) {
          const logoResponse = await window.api.business.getLogo(businessResponse.data.logoPath);
          if (logoResponse.success && logoResponse.data) {
            setLogoPreview(logoResponse.data);
          }
        }
      }
    } catch {
      showNotification('error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const response = await window.api.email.getConfig();
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch {
      showNotification('error', 'Failed to load email settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.host || !config.user || !config.fromEmail) {
      showNotification('error', 'Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await window.api.email.saveConfig(config);
      if (response.success) {
        showNotification('success', 'Email settings saved');
      } else {
        showNotification('error', response.error || 'Failed to save settings');
      }
    } catch {
      showNotification('error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.host || !config.user || !config.password) {
      showNotification('error', 'Please fill in server, username, and password');
      return;
    }

    setIsTesting(true);
    try {
      const response = await window.api.email.testConnection(config);
      if (response.success) {
        showNotification('success', 'Connection successful!');
      } else {
        showNotification('error', response.error || 'Connection failed');
      }
    } catch {
      showNotification('error', 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleUploadLogo = async () => {
    setIsUploadingLogo(true);
    try {
      const response = await window.api.business.uploadLogo();
      if (response.success && response.data) {
        setBusinessInfo({ ...businessInfo, logoPath: response.data });
        // Load preview of new logo
        const logoResponse = await window.api.business.getLogo(response.data);
        if (logoResponse.success && logoResponse.data) {
          setLogoPreview(logoResponse.data);
        }
        showNotification('success', 'Logo uploaded');
      } else if (response.error !== 'No file selected') {
        showNotification('error', response.error || 'Failed to upload logo');
      }
    } catch {
      showNotification('error', 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveBusinessInfo = async () => {
    if (!businessInfo.name) {
      showNotification('error', 'Business name is required');
      return;
    }

    setIsSavingBusiness(true);
    try {
      const response = await window.api.business.saveInfo(businessInfo);
      if (response.success) {
        showNotification('success', 'Business settings saved');
      } else {
        showNotification('error', response.error || 'Failed to save settings');
      }
    } catch {
      showNotification('error', 'Failed to save settings');
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      const response = await window.api.database.export();
      if (response.success && response.data) {
        showNotification('success', 'Database exported successfully');
      } else if (response.error !== 'Export cancelled') {
        showNotification('error', response.error || 'Failed to export database');
      }
    } catch {
      showNotification('error', 'Failed to export database');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async () => {
    setShowImportConfirm(false);
    setIsImporting(true);
    try {
      const response = await window.api.database.import();
      if (response.success) {
        showNotification('success', 'Database imported successfully. Please restart the app for changes to take effect.');
      } else if (response.error !== 'Import cancelled') {
        showNotification('error', response.error || 'Failed to import database');
      }
    } catch {
      showNotification('error', 'Failed to import database');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Business Information */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Business Information
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure your business details. This information will appear on invoices.
        </p>

        <div className="space-y-4">
          {/* Logo Upload */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Business logo"
                  className="w-24 h-24 object-contain border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Logo
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUploadLogo}
                isLoading={isUploadingLogo}
              >
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </Button>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Recommended: PNG or JPG, max 512x512px
              </p>
            </div>
          </div>

          <Input
            label="Business Name *"
            value={businessInfo.name}
            onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
            placeholder="Your Business Name"
          />

          <Input
            label="Address"
            value={businessInfo.address || ''}
            onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
            placeholder="123 Main Street, City"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={businessInfo.phone || ''}
              onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
              placeholder="+1 234 567 890"
            />
            <Input
              label="Email"
              type="email"
              value={businessInfo.email || ''}
              onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
              placeholder="contact@business.com"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveBusinessInfo} isLoading={isSavingBusiness}>
              Save Business Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Email Settings */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Email Configuration
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Configure SMTP settings to send invoices and reports via email.
          <br />
          <span className="text-amber-600 dark:text-amber-400">
            Note: Requires nodemailer package. Run: npm install nodemailer
          </span>
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SMTP Server *"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="smtp.gmail.com"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Port *"
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 587 })}
                placeholder="587"
              />
              <Select
                label="Security"
                options={[
                  { value: 'false', label: 'TLS (587)' },
                  { value: 'true', label: 'SSL (465)' },
                ]}
                value={config.secure ? 'true' : 'false'}
                onChange={(e) => setConfig({ ...config, secure: e.target.value === 'true' })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username *"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
              placeholder="your@email.com"
            />
            <Input
              label="Password *"
              type="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              placeholder="App password or SMTP password"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From Name"
              value={config.fromName}
              onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
              placeholder="Bigtal"
            />
            <Input
              label="From Email *"
              type="email"
              value={config.fromEmail}
              onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
              placeholder="noreply@yourbusiness.com"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              isLoading={isTesting}
            >
              Test Connection
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              Save Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Database Backup & Restore */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Database Backup & Restore
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Export your database to transfer to another computer, or restore from a previous backup.
        </p>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Export Database</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Create a backup of all your data that can be imported on another computer.
              </p>
              <Button
                variant="secondary"
                onClick={handleExportDatabase}
                isLoading={isExporting}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                }
              >
                Export Database
              </Button>
            </div>

            <div className="flex-1 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Import Database</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Restore from a backup file. This will replace all current data.
              </p>
              <Button
                variant="secondary"
                onClick={() => setShowImportConfirm(true)}
                isLoading={isImporting}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }
              >
                Import Database
              </Button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Warning:</strong> Importing a database will replace all current data. Make sure to export your current data first if you want to keep it.
            </p>
          </div>
        </div>
      </Card>

      {/* Import Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Database Import
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action will <strong className="text-red-600 dark:text-red-400">replace all your current data</strong> with the imported backup.
              This cannot be undone. Are you sure you want to continue?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowImportConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleImportDatabase}>
                Yes, Import Database
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          SMTP Setup Help
        </h3>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Gmail</h4>
            <p>Server: smtp.gmail.com | Port: 587 | Security: TLS</p>
            <p className="text-amber-600 dark:text-amber-400">
              Use an App Password (Settings &gt; Security &gt; 2-Step Verification &gt; App passwords)
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Outlook/Office 365</h4>
            <p>Server: smtp.office365.com | Port: 587 | Security: TLS</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Yahoo</h4>
            <p>Server: smtp.mail.yahoo.com | Port: 587 | Security: TLS</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
