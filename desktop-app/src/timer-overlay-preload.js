const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('timerOverlayAPI', {
    onAreaChanged: (callback) => {
        ipcRenderer.on('area-changed', (_event, areaName) => callback(areaName));
    },

    onTimerAction: (callback) => {
        ipcRenderer.on('timer-action', (_event, action) => callback(action));
    },

    startDrag: (overlayType, mousePos) => {
        ipcRenderer.send('overlay-mouse-down', overlayType, mousePos);
    },

    updateSettings: (overlayType, settings) => {
        ipcRenderer.send('update-overlay-settings', overlayType, settings);
    }
});