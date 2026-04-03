import { app, ipcMain } from 'electron';
import { createTray } from './tray';
import { fetchUsageData, refreshAndPush } from './usageService';
import { showOverlay } from './overlay';

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    refreshAndPush();
    showOverlay();
  });

  app.whenReady().then(() => {
    createTray();

    // IPC handler: renderer requests usage data
    ipcMain.handle('get-usage-data', async () => {
      return await fetchUsageData();
    });

    // IPC handler: renderer requests immediate refresh (fetches and pushes back)
    ipcMain.handle('request-refresh', async () => {
      await refreshAndPush();
    });

    // Auto-refresh every 5 minutes
    setInterval(() => {
      refreshAndPush();
    }, AUTO_REFRESH_INTERVAL);
  });

  // Keep app running when all windows are closed (tray app)
  app.on('window-all-closed', () => {
    // Do nothing — keep app running as a tray app
  });
}
