const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
    onAreaChanged: (callback) => {
        ipcRenderer.on('area-changed', (_event, areaName, mapInfo) => callback(areaName, mapInfo));
    },

    startDrag: (overlayType, mousePos) => {
        ipcRenderer.send('overlay-mouse-down', overlayType, mousePos);
    },

    updateSettings: (overlayType, settings) => {
        ipcRenderer.send('update-overlay-settings', overlayType, settings);
    },

    requestCurrentArea: () => {
        ipcRenderer.send('request-current-area');
    },

    openImageInOverlay: (imagePath) => {
        console.log("Sending request to open image:", imagePath);
        ipcRenderer.send('open-image-in-overlay', imagePath);
    }
});