import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { UpdateAvailableInfo, UpdateProgressInfo } from '../../shared/types';

let mainWindow: BrowserWindow | null = null;

function send(channel: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function initListeners(): void {
  autoUpdater.on('update-available', (info) => {
    const payload: UpdateAvailableInfo = {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseName: info.releaseName ?? undefined,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
    };
    send(IPC_CHANNELS.UPDATER_AVAILABLE, payload);
  });

  autoUpdater.on('update-not-available', () => send(IPC_CHANNELS.UPDATER_NOT_AVAILABLE));

  autoUpdater.on('download-progress', (p) => {
    const payload: UpdateProgressInfo = {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    };
    send(IPC_CHANNELS.UPDATER_PROGRESS, payload);
  });

  autoUpdater.on('update-downloaded', () => send(IPC_CHANNELS.UPDATER_DOWNLOADED));

  autoUpdater.on('error', (err) => send(IPC_CHANNELS.UPDATER_ERROR, err.message));
}

export const updaterService = {
  setWindow(win: BrowserWindow): void {
    mainWindow = win;
  },

  init(): void {
    if (!app.isPackaged) return;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    initListeners();
  },

  checkForUpdates(): void {
    if (!app.isPackaged) return;
    autoUpdater.checkForUpdates().catch((err) =>
      send(IPC_CHANNELS.UPDATER_ERROR, err.message)
    );
  },

  downloadUpdate(): void {
    if (!app.isPackaged) return;
    autoUpdater.downloadUpdate().catch((err) =>
      send(IPC_CHANNELS.UPDATER_ERROR, err.message)
    );
  },

  installUpdate(): void {
    autoUpdater.quitAndInstall(false, true);
  },
};
