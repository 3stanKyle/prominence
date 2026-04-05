import { app, ipcMain } from 'electron';
import { execFile } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { createTray } from './tray';
import { fetchUsageData, refreshAndPush } from './usageService';
import { showOverlay, hideOverlay } from './overlay';

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

    // IPC: renderer requests usage data
    ipcMain.handle('get-usage-data', async () => {
      return await fetchUsageData();
    });

    // IPC: renderer requests immediate refresh
    ipcMain.handle('request-refresh', async () => {
      await refreshAndPush();
    });

    // IPC: check if claude process is running
    ipcMain.handle('is-claude-active', () => {
      return new Promise<boolean>((resolve) => {
        execFile('tasklist', ['/FI', 'IMAGENAME eq claude.exe', '/NH'], { timeout: 3000 }, (err, stdout) => {
          if (err || !stdout) {
            resolve(false);
            return;
          }
          resolve(stdout.toLowerCase().includes('claude.exe'));
        });
      });
    });

    // IPC: get username
    ipcMain.handle('get-username', () => {
      return os.userInfo().username;
    });

    // IPC: get plan info from OAuth profile API
    ipcMain.handle('get-plan-info', async () => {
      try {
        const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
        const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        const token = creds?.claudeAiOauth?.accessToken;
        if (!token) return null;

        return new Promise((resolve) => {
          const https = require('https');
          const req = https.request({
            hostname: 'api.anthropic.com',
            path: '/api/oauth/profile',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'anthropic-beta': 'oauth-2025-04-20',
            },
          }, (res: any) => {
            let body = '';
            res.on('data', (c: Buffer) => { body += c; });
            res.on('end', () => {
              try {
                const data = JSON.parse(body);
                const orgType = data?.organization?.organization_type || '';
                if (orgType.includes('max')) resolve('Max');
                else if (orgType.includes('pro')) resolve('Pro');
                else if (orgType.includes('team')) resolve('Team');
                else resolve(orgType || null);
              } catch { resolve(null); }
            });
          });
          req.on('error', () => resolve(null));
          req.setTimeout(5000, () => { req.destroy(); resolve(null); });
          req.end();
        });
      } catch {
        return null;
      }
    });

    // IPC: window controls
    ipcMain.handle('minimize-window', () => {
      hideOverlay();
    });

    ipcMain.handle('close-window', () => {
      hideOverlay();
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
