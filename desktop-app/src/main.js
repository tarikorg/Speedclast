const { app, BrowserWindow, ipcMain, screen, protocol, globalShortcut } = require('electron')
const path = require('path');
const fs = require('fs');
const mapData = require('./services/mapDataService.js');
const Store = require('electron-store');
const { log, error } = require('./debug')

const store = new Store({
    name: 'speedclast-overlay-settings',
    defaults: {
        areaOverlay: {
            visible: true,
            width: 420,
            height: 520,
            x: 20,
            y: 100,
            opacity: 0.9
        },
        imageOverlay: {
            visible: false,
            width: 500,
            height: 400,
            x: 50,
            y: 150,
            opacity: 0.9
        },
        timerOverlay: {
            visible: true,
            width: 240,
            height: 70,
            x: 20,
            y: 20,
            opacity: 0.9
        }
    }
})


//client txt log file 
// dummy data for mvp
const logFilePath = path.join(app.getAppPath(), '..', 'log', 'Client.txt')

let mainWindow, areaOverlay, imageOverlay, timeOverlay;
let currentArea = null;
let currentMapInfo = null;

function createMainWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: Math.min(1100, width * 0.8),
        height: Math.min(800, height * 0.8),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        title: 'Speedclast',
        icon: path.join(__dirname, 'assets', 'icon.png')
    })//end of mmainWindow

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        app.quit();
    })
}

function createAreaOverlay() {
    const settings = store.get('areaOverlay');

    areaOverlay = new BrowserWindow({
        width: settings.width,
        height: settings.height,
        x: settings.x,
        y: settings.y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'overlay-preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    areaOverlay.loadFile(path.join(__dirname, 'area-overlay.html'));
    areaOverlay.setIgnoreMouseEvents(true);
    areaOverlay.setOpacity(settings.opacity);

    if (!settings.visible) {
        areaOverlay.hide();
    }
}

function createImageOverlay() {
    const settings = store.get('imageOverlay');

    imageOverlay = new BrowserWindow({
        width: settings.width,
        height: settings.height,
        x: settings.x,
        y: settings.y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'image-overlay-preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    imageOverlay.loadFile(path.join(__dirname, 'image-overlay.html'))
    imageOverlay.setOpacity(settings.opacity);

    if (!settings.visible) {
        imageOverlay.hide();
    }
}

function createTimerOverlay() {
    const settings = store.get('timerOverlay');

    timerOverlay = new BrowserWindow({
        width: settings.width,
        height: settings.height,
        x: settings.x,
        y: settings.y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'timer-overlay-preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    timerOverlay.loadFile(path.join(__dirname, 'timer-overlay.html'));
    timerOverlay.setIgnoreMouseEvents(true);
    timerOverlay.setOpacity(settings.opacity);

    if (!settings.visible) {
        timerOverlay.hide();
    }
}


function showImageInOverlay(imagePath) {
    if (imageOverlay && !imageOverlay.isDestroyed()) {
        if (!imageOverlay.isVisible()) {
            imageOverlay.show();
            //update settings
            const settings = store.get('imageOverlay');
            settings.visible = true;
            store.set('imageOverlay', settings);

            //notify the main window of the change
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('overlay-visibility-changed', 'image', true);
            }
        }
        imageOverlay.webContents.send('set-image', imagePath);

    }
}

app.whenReady().then(() => {
    protocol.registerFileProtocol('app', (request, callback) => {
        const url = request.url.substring(6);
        callback({ path: path.normalize(`${__dirname}/${url}`) });
    })
    createMainWindow();
    createAreaOverlay();
    createImageOverlay();
    createTimerOverlay();

    // Register global shortcuts
    globalShortcut.register('Alt+A', () => {
        toggleOverlay('area');
    });

    globalShortcut.register('Alt+T', () => {
        toggleOverlay('timer');
    });

    globalShortcut.register('Alt+I', () => {
        toggleOverlay('image');
    });

    globalShortcut.register('Alt+S', () => {
        // Start/pause timer
        if (timerOverlay && !timerOverlay.isDestroyed()) {
            timerOverlay.webContents.send('timer-action', 'toggle');
        }
    });

    startLogWatcher();
})




app.on('will-quit', () => {
    globalShortcut.unregisterAll();
})

function toggleOverlay(overlayType) {
    let overlay;
    let settingsKey;

    switch (overlayType) {
        case 'area':
            overlay = areaOverlay;
            settingsKey = 'areaOverlay';
            break;
        case 'image':
            overlay = imageOverlay;
            settingsKey = 'imageOverlay';
            break;
        case 'timer':
            overlay = timerOverlay;
            settingsKey = timerOverlay;
            break;
    }
    if (overlay && !overlay.isDestroyed()) {
        const settings = store.get(settingsKey);
        const newVisibility = !overlay.isVisible();

        if (newVisibility) {
            overlay.show();
        } else {
            overlay.hide();
        }

        //update settings
        settings.visible = newVisibility;
        store.set(settingsKey, settings);

        //notify the main window of the change
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('overlay-visibility-changed', overlayType, newVisibility);
        }
    }
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})


//==================
function startLogWatcher() {
    console.log(`Watching for changes in: ${logFilePath}`);

    // Ensure the log file and directory exist before watching
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, 'Log file created.\n');
    }

    let lastSize = fs.statSync(logFilePath).size;
    console.log(`Initial log file size: ${lastSize} bytes`);

    // Create a more robust file watcher
    const watcher = fs.watch(logFilePath, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
            try {
                const stats = fs.statSync(logFilePath);

                if (stats.size > lastSize) {
                    console.log(`Log file changed: ${lastSize} -> ${stats.size} bytes`);

                    const stream = fs.createReadStream(logFilePath, {
                        start: lastSize,
                        end: stats.size,
                    });

                    let newContent = '';

                    stream.on('data', (chunk) => {
                        newContent += chunk.toString('utf-8');
                    });

                    stream.on('end', () => {
                        const lines = newContent.split('\n').filter(line => line.trim() !== '');

                        for (const line of lines) {
                            const match = line.match(/: You have entered (.+)\./);
                            if (match && match[1]) {
                                const areaName = match[1];
                                console.log(`Area detected: ${areaName}`);
                                log(`Area detected: ${areaName}`);

                                // Get map data if available
                                const mapInfo = mapData[areaName] || {
                                    guide: "No specific guide available for this area.",
                                    rewards: null,
                                    pointsOfInterest: null,
                                    proTip: null,
                                    layoutImage: ["default.jpg"]
                                };

                                // Update current area info
                                currentArea = areaName;
                                currentMapInfo = mapInfo;

                                // Send to all windows that need this info
                                if (mainWindow && !mainWindow.isDestroyed()) {
                                    mainWindow.webContents.send('area-changed', areaName, mapInfo);
                                }

                                if (areaOverlay && !areaOverlay.isDestroyed()) {
                                    areaOverlay.webContents.send('area-changed', areaName, mapInfo);
                                }

                                // Only send the area name to the timer
                                if (timerOverlay && !timerOverlay.isDestroyed()) {
                                    timerOverlay.webContents.send('area-changed', areaName);
                                }
                            }
                        }

                        lastSize = stats.size;
                    });

                    stream.on('error', (err) => {
                        console.error('Error reading from log file:', err);
                    });

                } else if (stats.size < lastSize) {
                    // File was truncated or reset
                    console.log(`Log file was reset: ${lastSize} -> ${stats.size} bytes`);
                    lastSize = stats.size;
                }
            } catch (err) {
                console.error('Error handling file change:', err);
            }
        }
    });

    // Handle watcher errors
    watcher.on('error', (error) => {
        console.error('File watcher error:', error);
        // Try to restart the watcher after a brief delay
        setTimeout(() => {
            try {
                watcher.close();
                startLogWatcher();
            } catch (e) {
                console.error('Failed to restart watcher:', e);
            }
        }, 5000);
    });

    // Log that we've started watching
    console.log('File watcher started successfully');
}

// Handle IPC messages for overlay controls
ipcMain.on('toggle-overlay', (event, overlayType) => {
    let overlay;
    let settingsKey;

    switch (overlayType) {
        case 'area':
            overlay = areaOverlay;
            settingsKey = 'areaOverlay';
            break;
        case 'image':
            overlay = imageOverlay;
            settingsKey = 'imageOverlay';
            break;
        case 'timer':
            overlay = timerOverlay;
            settingsKey = 'timerOverlay';
            break;
    }

    if (overlay && !overlay.isDestroyed()) {
        const settings = store.get(settingsKey);
        const newVisibility = !overlay.isVisible();

        if (newVisibility) {
            overlay.show();
        } else {
            overlay.hide();
        }

        // Update settings
        settings.visible = newVisibility;
        store.set(settingsKey, settings);

        // Send back the new state
        event.reply('overlay-visibility-changed', overlayType, newVisibility);
    }
});

ipcMain.on('update-overlay-settings', (event, overlayType, newSettings) => {
    let overlay;
    let settingsKey;

    switch (overlayType) {
        case 'area':
            overlay = areaOverlay;
            settingsKey = 'areaOverlay';
            break;
        case 'image':
            overlay = imageOverlay;
            settingsKey = 'imageOverlay';
            break;
        case 'timer':
            overlay = timerOverlay;
            settingsKey = 'timerOverlay';
            break;
    }

    if (overlay && !overlay.isDestroyed()) {
        const settings = store.get(settingsKey);
        const updatedSettings = { ...settings, ...newSettings };

        // Apply new settings
        if (newSettings.width && newSettings.height) {
            overlay.setSize(newSettings.width, newSettings.height);
        }

        if (newSettings.x !== undefined && newSettings.y !== undefined) {
            overlay.setPosition(newSettings.x, newSettings.y);
        }

        if (newSettings.opacity !== undefined) {
            overlay.setOpacity(newSettings.opacity);
        }

        // Save settings
        store.set(settingsKey, updatedSettings);
    }
});

// Handle window dragging for overlays
ipcMain.on('overlay-mouse-down', (event, overlayType, { x, y }) => {
    let overlay;

    switch (overlayType) {
        case 'area':
            overlay = areaOverlay;
            break;
        case 'image':
            overlay = imageOverlay;
            break;
        case 'timer':
            overlay = timerOverlay;
            break;
    }

    if (overlay && !overlay.isDestroyed()) {
        // Enable mouse events during drag
        overlay.setIgnoreMouseEvents(false);

        const startPos = overlay.getPosition();
        const startMousePos = { x, y };

        const mouseMoveHandler = (e, mouseX, mouseY) => {
            const newX = startPos[0] + mouseX - startMousePos.x;
            const newY = startPos[1] + mouseY - startMousePos.y;
            overlay.setPosition(newX, newY);
        };

        const mouseUpHandler = () => {
            if (overlay && !overlay.isDestroyed()) {
                // Save the new position
                const newPos = overlay.getPosition();
                ipcMain.emit('update-overlay-settings', event, overlayType, {
                    x: newPos[0],
                    y: newPos[1]
                });

                // Restore ignore mouse events (except for image overlay)
                if (overlayType !== 'image') {
                    overlay.setIgnoreMouseEvents(true);
                }
            }

            // Remove event listeners
            overlay.webContents.removeListener('mouse-move', mouseMoveHandler);
            overlay.webContents.removeListener('mouse-up', mouseUpHandler);
        };

        overlay.webContents.on('mouse-move', mouseMoveHandler);
        overlay.webContents.on('mouse-up', mouseUpHandler);
    }
});

// Timer controls
ipcMain.on('timer-action', (event, action) => {
    if (timerOverlay && !timerOverlay.isDestroyed()) {
        timerOverlay.webContents.send('timer-action', action);
    }
});

// Request current area info (used when overlays are created)
ipcMain.on('request-current-area', (event) => {
    if (currentArea) {
        event.reply('area-changed', currentArea, currentMapInfo);
    }
});

// Handle image overlay requests
ipcMain.on('open-image-in-overlay', (event, imagePath) => {
    showImageInOverlay(imagePath)
});