import { BrowserWindow, screen } from 'electron';
import path from 'path';

const PRELOAD_PATH = path.join(__dirname, 'preload.js');

let overlayWindow: BrowserWindow | null = null;

export function createOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  overlayWindow = new BrowserWindow({
    width: 360,
    height: 460,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: PRELOAD_PATH,
    },
  });

  overlayWindow.loadFile(path.join(__dirname, '../../src/renderer/index.html'));

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

export function showOverlay(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
  }

  if (!overlayWindow!.isVisible()) {
    positionNearTray();
  }
  overlayWindow!.show();
  overlayWindow!.focus();
}

export function hideOverlay(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.hide();
}

function positionNearTray(): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const [windowWidth, windowHeight] = overlayWindow.getSize();

  const x = screenWidth - windowWidth - 8;
  const y = screenHeight - windowHeight - 8;

  overlayWindow.setPosition(x, y);
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow;
}
