import { app, ipcMain } from 'electron';
import { createTray } from './tray';
import { fetchUsageData } from './usageService';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Future: refresh data and show overlay
  });

  app.whenReady().then(() => {
    createTray();

    // IPC handler: renderer requests usage data
    ipcMain.handle('get-usage-data', async () => {
      return await fetchUsageData();
    });
  });

  // Keep app running when all windows are closed (tray app)
  app.on('window-all-closed', () => {
    // Do nothing — keep app running as a tray app
  });
}
