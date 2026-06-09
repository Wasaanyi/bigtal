import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './database/connection';
import { postgresManager } from './database/postgresManager';
import { migrateFromPglite } from './database/migratePgliteData';
import { runMigrations } from './database/migrations';
import { registerIpcHandlers } from './ipc';
import { updaterService } from './services/updaterService';
import { IPC_CHANNELS } from '../shared/constants';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

// Lightweight splash shown immediately while PostgreSQL starts, so a cold first
// launch looks intentional ("Starting…") rather than a frozen / failed app.
const SPLASH_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;overflow:hidden;font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .wrap{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
        background:linear-gradient(160deg,#0b3d2e 0%,#0f5132 100%);color:#fff}
  .brand{font-size:34px;font-weight:800;letter-spacing:.5px}
  .spinner{width:34px;height:34px;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;
           border-radius:50%;animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .status{font-size:13px;opacity:.85;min-height:18px}
</style></head><body><div class="wrap">
  <div class="brand">Bigtal</div>
  <div class="spinner"></div>
  <div class="status" id="status">Starting up…</div>
</div></body></html>`;

function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    resizable: false,
    center: true,
    show: true,
    backgroundColor: '#0b3d2e',
    title: 'Bigtal',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(SPLASH_HTML));
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function setSplashStatus(text: string): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents
      .executeJavaScript(`document.getElementById('status').textContent = ${JSON.stringify(text)}`)
      .catch(() => {
        /* splash may be closing */
      });
  }
}

function closeSplash(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
}

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
    closeSplash();
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

// Global safety nets: surface/log errors that escape the async init path or a
// detached promise instead of crashing the process silently.
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  const msg = error instanceof Error ? error.stack || error.message : String(error);
  // Avoid stacking dialogs if the window already failed to open.
  try {
    dialog.showErrorBox('Bigtal — Unexpected Error', msg);
  } catch {
    // dialog may be unavailable very early in startup; the log above suffices.
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

// One full attempt at bringing the database online.
async function initDatabaseStack(): Promise<void> {
  const { port } = await postgresManager.start();
  await initDatabase(port);
  // Migrations must run before the PGlite migration so tables exist.
  await runMigrations();
  await migrateFromPglite();
}

// Retry the database startup before surfacing an error — the first launch on a
// cold machine often just needs a second go once the OS/antivirus settles.
async function startDatabaseWithRetries(maxAttempts = 2): Promise<Error | null> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      setSplashStatus(attempt === 1 ? 'Starting database…' : `Starting database… (retry ${attempt})`);
      await initDatabaseStack();
      return null;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Database init attempt ${attempt} failed:`, error);
      // Reset connection + server so the next attempt starts clean.
      try { await closeDatabase(); } catch { /* ignore */ }
      try { await postgresManager.stop(); } catch { /* ignore */ }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  return lastError;
}

app.whenReady().then(async () => {
  createSplashWindow();

  // Keep retrying (with an explicit prompt between rounds) instead of quitting
  // outright, so a transient first-run hiccup never forces a manual relaunch.
  let error = await startDatabaseWithRetries();
  while (error) {
    const choice = dialog.showMessageBoxSync({
      type: 'error',
      buttons: ['Retry', 'Quit'],
      defaultId: 0,
      cancelId: 1,
      title: 'Bigtal — Startup Problem',
      message: 'Bigtal could not start its database.',
      detail:
        'This sometimes happens on the very first launch while your system finishes setting up. ' +
        'Please click Retry.\n\nDetails:\n' +
        error.message,
    });
    if (choice !== 0) {
      app.quit();
      return;
    }
    setSplashStatus('Retrying…');
    error = await startDatabaseWithRetries();
  }

  // Register IPC handlers (once) now that the database is ready.
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
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await closeDatabase();
    await postgresManager.stop();
    app.quit();
  }
});

app.on('before-quit', async () => {
  await closeDatabase();
  await postgresManager.stop();
});
