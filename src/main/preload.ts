import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('prominenceAPI', {
  getUsageData: () => ipcRenderer.invoke('get-usage-data'),
  onUsageDataUpdated: (callback: (data: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on('usage-data-updated', listener);
    return () => {
      ipcRenderer.removeListener('usage-data-updated', listener);
    };
  },
});
