/**
 * Updates date and time elements with the current UTC time
 */
function updateDateTime() {
    const now = new Date();

    // Format date as YYYY-MM-DD
    const dateStr = now.toISOString().split('T')[0];

    // Format time as HH:MM:SS
    const timeStr = now.toTimeString().split(' ')[0];

    // Update elements if they exist
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');

    if (dateElement) dateElement.textContent = dateStr;
    if (timeElement) timeElement.textContent = timeStr;

    // Update every second
    setTimeout(updateDateTime, 1000);
}

// Also add a function to set a static date for testing
function setStaticDateTime(dateStr, timeStr) {
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');

    if (dateElement) dateElement.textContent = dateStr;
    if (timeElement) timeElement.textContent = timeStr;
}

module.exports = { updateDateTime, setStaticDateTime };