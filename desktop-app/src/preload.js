const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Area data
    onAreaChanged: (callback) => {
        ipcRenderer.on('area-changed', (_event, areaName, mapInfo) => callback(areaName, mapInfo));
    },

    // Overlay controls
    toggleOverlay: (overlayType) => {
        ipcRenderer.send('toggle-overlay', overlayType);
    },

    onOverlayVisibilityChanged: (callback) => {
        ipcRenderer.on('overlay-visibility-changed', (_event, overlayType, isVisible) => callback(overlayType, isVisible));
    },

    updateOverlaySettings: (overlayType, settings) => {
        ipcRenderer.send('update-overlay-settings', overlayType, settings);
    },

    // Timer controls
    timerAction: (action) => {
        ipcRenderer.send('timer-action', action);
    },

    // Image display
    openImageInOverlay: (imagePath) => {
        ipcRenderer.send('open-image-in-overlay', imagePath);
    }
});