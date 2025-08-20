const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('overlayAPI', {

    onAreaChanged: (callback) => ipcRenderer.on('area-changed', (_event, value) => callback(value))
});