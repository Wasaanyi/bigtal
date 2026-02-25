import { dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { closeDatabase, initDatabase } from '../database/connection';
import { runMigrations } from '../database/migrations';

/**
 * Recursively copies a directory
 */
function copyDirectorySync(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Recursively deletes a directory
 */
function deleteDirectorySync(dir: string): void {
  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        deleteDirectorySync(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    fs.rmdirSync(dir);
  }
}

/**
 * Creates a simple archive by copying the database directory
 * and creating a manifest file
 */
function createBackupArchive(srcDir: string, destFile: string): void {
  const tempDir = destFile + '_temp';

  // Create temp directory with database contents
  copyDirectorySync(srcDir, tempDir);

  // Create manifest
  const manifest = {
    version: '1.0',
    created: new Date().toISOString(),
    app: 'Bigtal',
  };
  fs.writeFileSync(path.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Create a simple tar-like format (directory copy with .bigtal-backup extension)
  // For simplicity, we'll just copy the directory
  if (fs.existsSync(destFile)) {
    deleteDirectorySync(destFile);
  }
  fs.renameSync(tempDir, destFile);
}

/**
 * Extracts a backup archive to the destination directory
 */
function extractBackupArchive(srcFile: string, destDir: string): boolean {
  // Verify this is a valid backup
  const manifestPath = path.join(srcFile, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Invalid backup file: missing manifest');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.app !== 'Bigtal') {
    throw new Error('Invalid backup file: not a Bigtal backup');
  }

  // Remove existing database
  if (fs.existsSync(destDir)) {
    deleteDirectorySync(destDir);
  }

  // Copy backup to database location (excluding manifest)
  copyDirectorySync(srcFile, destDir);

  // Remove manifest from restored database
  const restoredManifest = path.join(destDir, 'manifest.json');
  if (fs.existsSync(restoredManifest)) {
    fs.unlinkSync(restoredManifest);
  }

  return true;
}

export const databaseBackupService = {
  /**
   * Exports the database to a backup file
   */
  async exportDatabase(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'bigtal-pg');

      if (!fs.existsSync(dbPath)) {
        return { success: false, error: 'Database not found' };
      }

      const defaultFileName = `bigtal-backup-${new Date().toISOString().slice(0, 10)}`;

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Database Backup',
        defaultPath: defaultFileName,
        filters: [
          { name: 'Bigtal Backup', extensions: ['bigtal-backup'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (canceled || !filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      // Ensure correct extension
      const finalPath = filePath.endsWith('.bigtal-backup') ? filePath : `${filePath}.bigtal-backup`;

      // Create backup
      createBackupArchive(dbPath, finalPath);

      return { success: true, filePath: finalPath };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * Imports a database from a backup file
   */
  async importDatabase(): Promise<{ success: boolean; error?: string }> {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import Database Backup',
        filters: [
          { name: 'Bigtal Backup', extensions: ['bigtal-backup'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openDirectory'],
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const backupPath = filePaths[0];
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'bigtal-pg');

      // Close the current database connection
      await closeDatabase();

      try {
        // Extract backup to database location
        extractBackupArchive(backupPath, dbPath);

        // Reinitialize database
        await initDatabase();
        await runMigrations();

        return { success: true };
      } catch (restoreError) {
        // Try to reinitialize anyway to have a working database
        try {
          await initDatabase();
          await runMigrations();
        } catch {
          // Ignore reinitialization errors
        }
        throw restoreError;
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};
