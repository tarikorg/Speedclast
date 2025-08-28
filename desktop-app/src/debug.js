const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log(`[${new Date().toISOString()}]`, ...args);
    }
}

function error(...args) {
    if (DEBUG) {
        console.error(`[${new Date().toISOString()}]`, ...args);
    }
}

module.exports = { log, error };