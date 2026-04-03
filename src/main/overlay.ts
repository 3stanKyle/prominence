import { BrowserWindow, screen } from 'electron';
import path from 'path';

let overlayWindow: BrowserWindow | null = null;

export function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  overlayWindow = new BrowserWindow({
    width: 320,
    height: 200,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  overlayWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));

  // Close on blur (click outside)
  overlayWindow.on('blur', () => {
    hideOverlay();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

export function toggleOverlay(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
  }

  if (overlayWindow!.isVisible()) {
    hideOverlay();
  } else {
    showOverlay();
  }
}

function showOverlay(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  positionNearTray();
  overlayWindow.show();
  overlayWindow.focus();
}

function hideOverlay(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.hide();
}

function positionNearTray(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const [windowWidth, windowHeight] = overlayWindow.getSize();

  // Position in bottom-right corner, near system tray on Windows
  const x = screenWidth - windowWidth - 10;
  const y = screenHeight - windowHeight - 10;

  overlayWindow.setPosition(x, y);
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow;
}
