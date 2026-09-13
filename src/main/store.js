'use strict';

const fs = require('node:fs');
const path = require('node:path');
const electron = (process.versions && process.versions.electron) ? require('electron') : null;
const app = electron?.app;

const DEFAULTS = {
  theme: 'dark',
  autoApprove: false,
  language: 'en',
  sidebarCollapsed: false,
  reduceMotion: false,
};

let cache = null;
let saveTimer = null;

function settingsFile() {
  const dir = (app && typeof app.getPath === 'function')
    ? app.getPath('userData')
    : path.join(process.cwd(), '.nrd');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
  return path.join(dir, 'settings.json');
}

function load() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

function persistNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(load(), null, 2), 'utf8');
  } catch (err) {
    console.error('[store] failed to persist settings:', err.message);
  }
}

function persistDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, 150);
}

/** @returns {*} */
function get(key, fallback) {
  const data = load();
  const value = data[key];
  return value === undefined ? fallback : value;
}

/** Set a key and persist (debounced). Returns the value. */
function set(key, value) {
  load()[key] = value;
  persistDebounced();
  return value;
}

function all() {
  return { ...load() };
}

app.on('will-quit', () => {
  if (saveTimer) persistNow();
});

module.exports = { get, set, all };
