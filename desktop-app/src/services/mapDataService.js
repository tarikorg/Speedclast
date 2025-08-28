const fs = require('fs');
const path = require('path');

function loadActJson(filename) {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/data', filename), 'utf8'))
    } catch (e) {
        console.error('Failed to load:', filename, e);
        return {};
    }
}

const actOne = loadActJson('Act_One.json');
const actTwo = loadActJson('Act_Two.json');
const actThree = loadActJson('Act_Three.json');

const mapData = { ...actOne, ...actTwo, ...actThree };
module.exports = mapData;