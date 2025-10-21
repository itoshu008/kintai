const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(name, fallback) {
  try {
    const p = path.join(DATA_DIR, name);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { 
    return fallback; 
  }
}

function writeJson(name, data) {
  const p = path.join(DATA_DIR, name);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

module.exports = {
  ensureDir,
  readJson,
  writeJson
};
