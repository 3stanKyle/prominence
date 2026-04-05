import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('prominenceAPI', {
  getUsageData: () => ipcRenderer.invoke('get-usage-data'),
  requestRefresh: () => ipcRenderer.invoke('request-refresh'),
  isClaudeActive: () => ipcRenderer.invoke('is-claude-active'),
  getUsername: () => ipcRenderer.invoke('get-username'),
  getPlanInfo: () => ipcRenderer.invoke('get-plan-info'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onUsageDataUpdated: (callback: (data: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on('usage-data-updated', listener);
    return () => {
      ipcRenderer.removeListener('usage-data-updated', listener);
    };
  },
});
