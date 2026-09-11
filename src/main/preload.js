'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const VALID_EVENTS = new Set(['window:maximized', 'settings:changed', 'updater:state']);

/**
 * Subscribe to main-process push events through a validated channel allowlist.
 * @param {string} channel
 * @param {(payload: any) => void} cb
 * @returns {() => void} unsubscribe
 */
function on(channel, cb) {
  if (!VALID_EVENTS.has(channel) || typeof cb !== 'function') return () => {};
  const listener = (_event, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('nrd', {
  /* window controls (frameless title bar) */
  minimize: () => ipcRenderer.send('window:minimize'),
  toggleMaximize: () => ipcRenderer.send('window:maximize-toggle'),
  closeWindow: () => ipcRenderer.send('window:close'),
  onWindowFlags: (cb) => on('window:maximized', cb),

  /* init + settings */
  init: () => ipcRenderer.invoke('app:getInfo'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),

  /* updater */
  updaterGetState: () => ipcRenderer.invoke('updater:getState'),
  updaterCheck: () => ipcRenderer.invoke('updater:check'),
  updaterDownload: () => ipcRenderer.invoke('updater:download'),
  updaterInstall: () => ipcRenderer.send('updater:install'),
  onUpdaterState: (cb) => on('updater:state', cb),

  /* misc */
  showMessage: (title, message) => ipcRenderer.send('dialog:showMessage', { title, message }),

  /* platform flags */
  isMac: process.platform === 'darwin',
});
