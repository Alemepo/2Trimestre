const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  scrapeData: (params) => ipcRenderer.invoke('scrape-data', params),
});
