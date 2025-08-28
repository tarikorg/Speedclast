const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imageOverlayAPI', {
    onAreaChanged: (callback) => {
        ipcRenderer.on('area-changed', (_event, areaName, mapInfo) => callback(areaName, mapInfo))
    },

    onSetImage: (callback) => {
        ipcRenderer.on('set-image', (_event, imagePath) => callback(imagePath));
    },

    startDrag: (overlayType, mousePos) => {
        ipcRenderer.send('overlay-mouse-down', overlayType, mousePos);
    },

    toggleOverlay: (overlayType) => {
        ipcRenderer.send('toggle-overlay', overlayType)
    },

    updateSettings: (overlayType, settings) => {
        ipcRenderer.send('update-overlay-settings', overlayType, settings);
    },

    requestCurrentArea: () => {
        ipcRenderer.send('request-current-area')
    }

})