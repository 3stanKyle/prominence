import { app } from 'electron';
import { createTray } from './tray';

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
  });

  // Keep app running when all windows are closed (tray app)
  app.on('window-all-closed', () => {
    // Do nothing — keep app running as a tray app
  });
}
