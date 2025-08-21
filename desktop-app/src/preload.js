const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onAreaChanged: (callback) => ipcRenderer.on('area-changed', (_event, value) => callback(value)),
    toggleOverlay: () => ipcRenderer.send('toggle-overlay')
})