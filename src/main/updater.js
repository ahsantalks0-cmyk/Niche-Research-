'use strict';

const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const { resolveGitHubRepo } = require('./config');

/**
 * Updater state machine shared with the renderer.
 * status: disabled-dev | idle | checking | up-to-date | available
 *       | downloading | downloaded | error
 */
const state = {
  status: 'idle',
  version: null,          // version of the available update
  currentVersion: app.getVersion(),
  releaseDate: null,
  percent: 0,
  transferredMb: 0,
  totalMb: 0,
  bytesPerSecond: 0,
  etaSec: null,
  message: null,          // human-readable note for banner/footer
};

let configured = false;

function sender() {
  const win = BrowserWindow.getAllWindows()[0];
  return win && !win.isDestroyed() ? win.webContents : null;
}

function patch(next) {
  Object.assign(state, next);
  const s = sender();
  if (s) s.send('updater:state', { ...state });
}

function fmtMb(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function isDevLike() {
  return !app.isPackaged || !!process.env.NRD_FORCE_UPDATER;
}

function configure() {
  if (configured) return;
  configured = true;

  const repo = resolveGitHubRepo();
  if (repo) {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: repo.owner,
      repo: repo.repo,
      vPrefixedTagName: true,
      allowPrerelease: false,
    });
  }
  autoUpdater.autoDownload = false;      // user chooses via one-click "Update Now"
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => patch({ status: 'checking', message: 'Checking for updates…' }));

  autoUpdater.on('update-available', (info) => patch({
    status: 'available',
    version: info.version,
    releaseDate: info.releaseDate || null,
    message: `New version available — v${info.version}`,
  }));

  autoUpdater.on('update-not-available', (info) => patch({
    status: 'up-to-date',
    version: info.version,
    message: 'You are on the latest version.',
  }));

  autoUpdater.on('download-progress', (p) => {
    const eta = p.bytesPerSecond > 0 && p.total > 0
      ? Math.max(0, Math.round((p.total - p.transferred) / p.bytesPerSecond))
      : null;
    patch({
      status: 'downloading',
      version: state.version,
      percent: Math.round(p.percent * 10) / 10,
      transferredMb: fmtMb(p.transferred),
      totalMb: fmtMb(p.total),
      bytesPerSecond: Math.round(p.bytesPerSecond),
      etaSec: eta,
    });
  });

  autoUpdater.on('update-downloaded', (info) => patch({
    status: 'downloaded',
    version: info.version,
    percent: 100,
    transferredMb: state.totalMb,
    message: 'Update ready — restart to apply.',
  }));

  autoUpdater.on('error', (err) => patch({
    status: 'error',
    message: String(err && err.message ? err.message : err),
  }));
}

/** Silent check on app start (packaged builds only, unless NRD_FORCE_UPDATER). */
function checkOnStart() {
  configure();
  if (isDevLike()) {
    patch({ status: 'disabled-dev', message: 'Updater disabled in development.' });
    return;
  }
  patch({ status: 'checking' });
  autoUpdater.checkForUpdates().catch(() => { /* state already 'error' via event */ });
}

/** Explicit check (Settings button). Resolves with the resulting state. */
async function checkForUpdates() {
  configure();
  if (isDevLike()) {
    patch({ status: 'disabled-dev', message: 'Updater disabled in development.' });
    return { ...state };
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch { /* handled by 'error' event */ }
  return { ...state };
}

/** One-click "Update Now": download, then the renderer offers restart. */
async function downloadUpdate() {
  configure();
  try {
    patch({ status: 'downloading', percent: 0, transferredMb: 0, etaSec: null });
    await autoUpdater.downloadUpdate();
  } catch { /* handled by 'error' event */ }
  return { ...state };
}

/** Restart the app and install the pending update. */
function installUpdate() {
  configure();
  autoUpdater.quitAndInstall(false, true);
}

function getState() {
  return { ...state };
}

module.exports = { checkOnStart, checkForUpdates, downloadUpdate, installUpdate, getState };
