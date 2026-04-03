import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';

let tray: Tray | null = null;

export function createTray(): Tray {
  // Create a simple 16x16 icon using nativeImage
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Prominence - Claude Code Usage');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        // Future: toggle overlay window
      },
    },
    {
      label: 'Refresh',
      click: () => {
        // Future: refresh usage data
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  return tray;
}

function createTrayIcon(): Electron.NativeImage {
  // Create a simple 16x16 colored icon programmatically
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      // Simple circular icon with a blue-purple gradient
      const cx = x - size / 2;
      const cy = y - size / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);

      if (dist < size / 2 - 1) {
        canvas[offset] = 100;     // R
        canvas[offset + 1] = 140; // G
        canvas[offset + 2] = 230; // B
        canvas[offset + 3] = 255; // A
      } else {
        canvas[offset] = 0;
        canvas[offset + 1] = 0;
        canvas[offset + 2] = 0;
        canvas[offset + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, {
    width: size,
    height: size,
  });
}

export function getTray(): Tray | null {
  return tray;
}
