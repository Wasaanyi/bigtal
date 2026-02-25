import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type { UpdateAvailableInfo, UpdateProgressInfo } from '../../shared/types';

type UpdatePhase = 'available' | 'downloading' | 'downloaded' | 'error';

interface UpdateState {
  phase: UpdatePhase;
  info?: UpdateAvailableInfo;
  progress?: UpdateProgressInfo;
  errorMessage?: string;
}

export function UpdateModal() {
  const [state, setState] = useState<UpdateState | null>(null);

  useEffect(() => {
    const removeAvailable = window.api.updater.onAvailable((info) => {
      setState({ phase: 'available', info });
    });

    const removeProgress = window.api.updater.onProgress((progress) => {
      setState((prev) => prev ? { ...prev, phase: 'downloading', progress } : null);
    });

    const removeDownloaded = window.api.updater.onDownloaded(() => {
      setState((prev) => prev ? { ...prev, phase: 'downloaded' } : null);
    });

    const removeError = window.api.updater.onError((message) => {
      setState((prev) => prev ? { ...prev, phase: 'error', errorMessage: message } : null);
    });

    return () => {
      removeAvailable();
      removeProgress();
      removeDownloaded();
      removeError();
    };
  }, []);

  if (!state) return null;

  const isDownloading = state.phase === 'downloading';

  function handleClose() {
    if (isDownloading) return;
    setState(null);
  }

  function handleDownload() {
    setState((prev) => prev ? { ...prev, phase: 'downloading' } : null);
    window.api.updater.download();
  }

  function handleInstall() {
    window.api.updater.install();
  }

  const title =
    state.phase === 'available' ? 'Update Available' :
    state.phase === 'downloading' ? 'Downloading Update...' :
    state.phase === 'downloaded' ? 'Update Ready' :
    'Update Error';

  return (
    <Modal
      isOpen
      onClose={handleClose}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        {state.phase === 'available' && state.info && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Version <span className="font-semibold text-gray-900 dark:text-white">{state.info.version}</span> is available.
              {state.info.releaseName && (
                <span className="block mt-1 text-gray-500 dark:text-gray-400">{state.info.releaseName}</span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={handleClose}>Later</Button>
              <Button variant="primary" onClick={handleDownload}>Download</Button>
            </div>
          </>
        )}

        {state.phase === 'downloading' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {state.progress
                ? `${Math.round(state.progress.percent)}% — ${formatBytes(state.progress.transferred)} / ${formatBytes(state.progress.total)}`
                : 'Starting download...'}
            </p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${state.progress?.percent ?? 0}%` }}
              />
            </div>
          </>
        )}

        {state.phase === 'downloaded' && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The update has been downloaded. Restart now to apply it, or it will be installed automatically when you close the app.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={handleClose}>Later</Button>
              <Button variant="primary" onClick={handleInstall}>Restart &amp; Install</Button>
            </div>
          </>
        )}

        {state.phase === 'error' && (
          <>
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.errorMessage || 'An unknown error occurred while checking for updates.'}
            </p>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={handleClose}>Close</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
