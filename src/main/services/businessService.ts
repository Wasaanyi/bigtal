import { app, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getDatabase } from '../database/connection';
import type { BusinessInfo } from '../../shared/types';

export const businessService = {
  /**
   * Get business info from database
   */
  async getInfo(): Promise<BusinessInfo | null> {
    const db = getDatabase();
    const result = await db
      .prepare("SELECT value FROM app_settings WHERE key = 'business_info'")
      .get() as { value: string } | undefined;

    if (!result) {
      return null;
    }

    try {
      return JSON.parse(result.value) as BusinessInfo;
    } catch {
      return null;
    }
  },

  /**
   * Save business info to database
   */
  async saveInfo(info: BusinessInfo): Promise<void> {
    const db = getDatabase();
    const infoJson = JSON.stringify(info);

    await db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES ('business_info', ?)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `).run(infoJson);
  },

  /**
   * Upload a logo file - opens file dialog and copies to userData
   */
  async uploadLogo(): Promise<{ success: boolean; logoPath?: string; error?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select Business Logo',
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' };
      }

      const sourcePath = result.filePaths[0];
      const ext = path.extname(sourcePath);
      const logosDir = path.join(app.getPath('userData'), 'logos');

      // Create logos directory if it doesn't exist
      if (!fs.existsSync(logosDir)) {
        fs.mkdirSync(logosDir, { recursive: true });
      }

      // Generate unique filename
      const filename = `logo-${Date.now()}${ext}`;
      const destPath = path.join(logosDir, filename);

      // Copy file to userData
      fs.copyFileSync(sourcePath, destPath);

      return { success: true, logoPath: destPath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Get logo as base64 data URL for print compatibility
   */
  async getLogoAsDataUrl(logoPath: string): Promise<string | null> {
    try {
      if (!logoPath || !fs.existsSync(logoPath)) {
        return null;
      }

      const fileBuffer = fs.readFileSync(logoPath);
      const base64 = fileBuffer.toString('base64');

      // Determine mime type from extension
      const ext = path.extname(logoPath).toLowerCase();
      let mimeType = 'image/png';
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.svg':
          mimeType = 'image/svg+xml';
          break;
      }

      return `data:${mimeType};base64,${base64}`;
    } catch {
      return null;
    }
  },
};
