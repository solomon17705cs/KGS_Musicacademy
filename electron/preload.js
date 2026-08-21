const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  printHTML: (html) => ipcRenderer.invoke('print-html', html),
});
