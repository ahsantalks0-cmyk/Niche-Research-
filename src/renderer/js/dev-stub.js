'use strict';

/**
 * dev-stub.js — browser-only mock of the preload bridge (window.nrd).
 * No-ops in the packaged app where the real preload defines window.nrd first.
 */
(function () {
  if (window.nrd) return;

  const updaterSubs = [];
  const updaterState = {
    status: 'idle', version: null, currentVersion: '0.1.0',
    percent: 0, transferredMb: 0, totalMb: 50.1,
    bytesPerSecond: 0, etaSec: null, message: null,
  };
  const emit = (subs, payload) => subs.forEach((fn) => fn(payload));

  window.nrd = {
    minimize: () => {},
    toggleMaximize: () => {},
    closeWindow: () => {},
    onWindowFlags: () => () => {},

    init: async () => ({
      name: 'Niche Research Department', shortName: 'NRD',
      tagline: 'Agentic Intelligence for Niche Discovery',
      version: '0.1.0', electron: '44.3.0', chrome: '142.0.7438.0',
      platform: 'win32', maximized: false,
    }),

    getSettings: async () => ({
      theme: localStorage.getItem('nrd.theme') || 'dark',
      autoApprove: false,
      language: 'en',
      sidebarCollapsed: false,
      reduceMotion: false,
    }),

    setSettings: async (patch) => {
      if (patch.theme) localStorage.setItem('nrd.theme', patch.theme);
      return {};
    },

    updaterGetState: async () => ({ ...updaterState }),
    updaterCheck: async () => {
      Object.assign(updaterState, { status: 'available', version: '0.2.0', message: 'New version available — v0.2.0' });
      emit(updaterSubs, { ...updaterState });
      return { ...updaterState };
    },
    updaterDownload: async () => {
      Object.assign(updaterState, { status: 'downloading', percent: 0, transferredMb: 0 });
      emit(updaterSubs, { ...updaterState });
      for (let p = 10; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 320));
        Object.assign(updaterState, {
          percent: p,
          transferredMb: Math.round(50.1 * (p / 100) * 10) / 10,
          bytesPerSecond: 1_450_000,
          etaSec: Math.round((100 - p) * 0.32),
        });
        emit(updaterSubs, { ...updaterState });
      }
      Object.assign(updaterState, { status: 'downloaded' });
      emit(updaterSubs, { ...updaterState });
      return { ...updaterState };
    },
    updaterInstall: () => {},
    onUpdaterState: (cb) => { updaterSubs.push(cb); return () => {}; },

    showMessage: () => {},
    isMac: false,
  };
})();
