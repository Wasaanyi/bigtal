import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './database/connection';
import { runMigrations } from './database/migrations';
import { registerIpcHandlers } from './ipc';
import { updaterService } from './services/updaterService';
import { IPC_CHANNELS } from '../shared/constants';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  // Hide the application menu
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: 'Bigtal',
    icon: path.join(__dirname, '../../assets/icons', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    backgroundColor: '#f9fafb',
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production: __dirname is dist/main/main/, renderer is at dist/renderer/
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Open external URL handler
ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL_URL, async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

app.whenReady().then(async () => {
  try {
    // Initialize database
    await initDatabase();

    // Run migrations
    await runMigrations();

    // Register IPC handlers
    registerIpcHandlers();

    // Create window
    createWindow();

    // Initialize auto-updater
    if (mainWindow) {
      updaterService.setWindow(mainWindow);
      updaterService.init();
      mainWindow.webContents.once('did-finish-load', () => {
        setTimeout(() => updaterService.checkForUpdates(), 3000);
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await closeDatabase();
    app.quit();
  }
});

app.on('before-quit', async () => {
  await closeDatabase();
});
