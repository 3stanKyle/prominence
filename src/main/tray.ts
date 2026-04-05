import { Tray, Menu, nativeImage, app } from 'electron';
import { toggleOverlay } from './overlay';
import { refreshAndPush } from './usageService';

let tray: Tray | null = null;

export function createTray(): Tray {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Prominence - Claude Code Usage');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        toggleOverlay();
      },
    },
    {
      label: 'Refresh',
      click: () => {
        refreshAndPush();
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

  // Left-click toggles overlay
  tray.on('click', () => {
    toggleOverlay();
  });

  return tray;
}

function createTrayIcon(): Electron.NativeImage {
  // 16x16 pixel art of the Claude character in orange (#D4845A)
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  const O = [0xD4, 0x84, 0x5A, 0xFF]; // orange body
  const B = [0x00, 0x00, 0x00, 0xFF]; // black (eyes)
  const T = [0x00, 0x00, 0x00, 0x00]; // transparent

  // Character pixel map (16x16)
  // Two antennae, rectangular head with eyes, arms, four legs
  const pixels: number[][][] = [
    [T,T,T,T,O,O,T,T,T,T,O,O,T,T,T,T], // row 0: antennae
    [T,T,T,T,O,O,T,T,T,T,O,O,T,T,T,T], // row 1: antennae
    [T,T,T,O,O,O,O,O,O,O,O,O,O,T,T,T], // row 2: head top
    [T,T,T,O,O,O,O,O,O,O,O,O,O,T,T,T], // row 3: head
    [T,T,T,O,O,B,O,O,O,B,O,O,O,T,T,T], // row 4: eyes
    [T,T,T,O,O,B,O,O,O,B,O,O,O,T,T,T], // row 5: eyes
    [T,T,T,O,O,O,O,O,O,O,O,O,O,T,T,T], // row 6: below eyes
    [T,O,O,O,O,O,O,O,O,O,O,O,O,O,O,T], // row 7: arms extend
    [T,O,O,O,O,O,O,O,O,O,O,O,O,O,O,T], // row 8: arms extend
    [T,T,T,O,O,O,O,O,O,O,O,O,O,T,T,T], // row 9: lower body
    [T,T,T,O,O,O,O,O,O,O,O,O,O,T,T,T], // row 10: lower body
    [T,T,T,O,O,T,O,O,T,O,O,T,T,T,T,T], // row 11: legs start
    [T,T,T,O,O,T,O,O,T,O,O,T,T,T,T,T], // row 12: legs
    [T,T,T,O,O,T,O,O,T,O,O,T,T,T,T,T], // row 13: legs
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T], // row 14
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T], // row 15
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * 4;
      const color = pixels[y][x];
      canvas[offset] = color[0];     // R
      canvas[offset + 1] = color[1]; // G
      canvas[offset + 2] = color[2]; // B
      canvas[offset + 3] = color[3]; // A
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
