const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path');
const fs = require('fs');


//client txt log file 
// dummy data for mvp
const logFilePath = path.join(app.getAppPath(), '..', 'log', 'Client.txt')

let mainWindow;
let overlayWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        title: 'SpeedClast'
    }); //end of Browserwindow

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        app.quit();
    })


}//create window

function createOverlayWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    overlayWindow = new BrowserWindow({
        width: 300,
        height: 100,
        x: Math.floor(width / 2) - 150,
        y: 100,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            preload: path.join(__dirname, 'overlay-preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    })
    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
    overlayWindow.setIgnoreMouseEvents(true); //clickthrough enabled
}//createOverlayWindow end




app.whenReady().then(() => {
    createWindow();
    createOverlayWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
            createOverlayWindow();
        }
    })

    startLogWatcher();
})//app whenready



app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})//app.on.windowallclosed




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

    fs.watch(logFilePath, (eventType, filename) => {
        if (eventType === 'change') {
            fs.stat(logFilePath, (err, stats) => {
                if (err) {
                    console.error('Error stating file:', err);
                    return;
                }

                // Only read the new content
                if (stats.size > lastSize) {
                    const stream = fs.createReadStream(logFilePath, {
                        start: lastSize,
                        end: stats.size,
                    });

                    stream.on('data', (chunk) => {
                        const newLines = chunk.toString('utf-8');
                        const lines = newLines.split('\n').filter(line => line.trim() !== '');

                        for (const line of lines) {
                            // The specific log message we are looking for
                            const match = line.match(/: You have entered (.+)\./);
                            if (match && match[1]) {
                                const areaName = match[1];
                                console.log(`Area detected: ${areaName}`);
                                // Send the detected area name to the renderer process (our UI)
                                mainWindow.webContents.send('area-changed', areaName);
                                if (overlayWindow && !overlayWindow.isDestroyed()) {
                                    overlayWindow.webContents.send('area-changed', areaName);
                                }
                            }
                        }
                    });

                    lastSize = stats.size;
                } else if (stats.size < lastSize) {
                    // Handle log file reset (e.g., game restart)
                    lastSize = stats.size;
                }
            });
        }
    });
}

ipcMain.on('toggle-overlay', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        if (overlayWindow.isVisible()) {
            overlayWindow.hide();
        } else {
            overlayWindow.show();
        }
    }
})