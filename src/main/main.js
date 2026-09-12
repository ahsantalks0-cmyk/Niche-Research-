'use strict';

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu,
  nativeTheme,
} = require('electron');
const path = require('node:path');
const { config } = require('./config');
const store = require('./store');
const updater = require('./updater');
const db = require('./db');
const { registerDbIpc, registerEngineIpc } = require('./ipc');
const { browserEngine } = require('./engine');

/* ------------------------- app identity & hardening ------------------------- */

app.setAppUserModelId('app.nicheresearch.department');

/** @type {BrowserWindow | null} */
let mainWindow = null;

// Hard requirement for this app: everything is local content.
app.commandLine.appendSwitch('disable-features', 'Autofill');

/* ------------------------------- main window -------------------------------- */

function iconPath() {
  return path.join(config.paths.assets, 'icons', 'icon.png');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    minWidth: config.window.minWidth,
    minHeight: config.window.minHeight,
    show: false, // revealed after first paint → smooth open animation
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#000000',
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // External links open in the system browser — never inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    if (process.env.NRD_SMOKE_TEST !== '1') {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('maximize', () => sendWindowFlags());
  mainWindow.on('unmaximize', () => sendWindowFlags());
  mainWindow.on('enter-full-screen', () => sendWindowFlags());
  mainWindow.on('leave-full-screen', () => sendWindowFlags());
  mainWindow.on('closed', () => { mainWindow = null; });

  // Native menu is hidden (frameless custom title bar) but keep accelerators alive.
  const menu = Menu.buildFromTemplate([
    {
      label: 'Window',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
        { type: 'separator' },
        { role: 'minimize', accelerator: 'CmdOrCtrl+M' },
        { role: 'close', accelerator: 'CmdOrCtrl+W' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'zoom' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function sendWindowFlags() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('window:maximized', {
    maximized: mainWindow.isMaximized(),
    fullscreen: mainWindow.isFullScreen(),
  });
}

/* ---------------------------------- IPC ------------------------------------- */

// Window controls (frameless title bar)
ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window:maximize-toggle', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow && mainWindow.close());

// Settings bridge
ipcMain.handle('settings:get', () => store.all());
ipcMain.handle('settings:set', (_e, patchObj) => {
  const keys = ['theme', 'autoApprove', 'language', 'sidebarCollapsed', 'reduceMotion'];
  for (const k of keys) {
    if (patchObj && Object.prototype.hasOwnProperty.call(patchObj, k)) store.set(k, patchObj[k]);
  }
  return store.all();
});

// App metadata
ipcMain.handle('app:getInfo', () => ({
  name: config.appName,
  shortName: config.appShort,
  tagline: config.tagline,
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  platform: process.platform,
  maximized: mainWindow ? mainWindow.isMaximized() : false,
}));

// Updater bridge
ipcMain.handle('updater:getState', () => updater.getState());
ipcMain.handle('updater:check', () => updater.checkForUpdates());
ipcMain.handle('updater:download', () => updater.downloadUpdate());
ipcMain.on('updater:install', () => updater.installUpdate());

// Dialog for the "Start Research" tooltip affordance
ipcMain.on('dialog:showMessage', (_e, opts) => {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: opts && opts.title ? opts.title : 'Niche Research Department',
    message: opts && opts.message ? opts.message : '',
    buttons: ['OK'],
  });
});

/* ------------------------------- app lifecycle ------------------------------ */

app.whenReady().then(() => {
  // Initialize SQLite database and register IPC handlers
  try {
    db.getDb();
    registerDbIpc();
  } catch (err) {
    console.error('[db] Failed to initialize SQLite database:', err);
  }

  const dbSettings = db.getSettings();
  const savedTheme = dbSettings ? dbSettings.theme : store.get('theme', 'dark');
  nativeTheme.themeSource = savedTheme === 'light' ? 'light' : 'dark';
  createWindow();
  registerEngineIpc(mainWindow);

  // Initialize Department Head & recover runs
  try {
    const { chainEngine } = require('./engine/chainEngine');
    chainEngine.recoverRunsOnStartup().catch((err) => {
      console.warn('[main] Startup run recovery error:', err.message);
    });
  } catch (err) {
    console.warn('[main] Could not initialize chain engine recovery:', err.message);
  }

  // Silent update check ~2.5s after launch, so it never blocks first paint.
  setTimeout(() => updater.checkOnStart(), 2500);

  // CI smoke test: boot main + preload, confirm the window renders, exit 0.
  if (process.env.NRD_SMOKE_TEST === '1') {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('[smoke] window rendered OK');
      setTimeout(() => app.exit(0), 500);
    });
    setTimeout(() => {
      console.error('[smoke] did-finish-load timed out');
      app.exit(1);
    }, 15000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  browserEngine.close().catch(() => {});
});
