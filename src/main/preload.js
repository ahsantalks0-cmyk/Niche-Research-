'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const VALID_EVENTS = new Set([
  'window:maximized',
  'settings:changed',
  'updater:state',
  'engine:log',
  'captcha:detected',
  'captcha:resolved',
  'slots:updated',
  'rate-limiter:wait',
  'engine:run-status',
  'engine:agent-status',
  'engine:system-test-log',
]);

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

contextBridge.exposeInMainWorld('dbAPI', {
  /* Settings */
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  saveSettings: (patch) => ipcRenderer.invoke('db:saveSettings', patch),

  /* Countries */
  getCountries: (activeOnly) => ipcRenderer.invoke('db:getCountries', activeOnly),

  /* Runs */
  createRun: (runData, countryCodes, criteriaBrief) =>
    ipcRenderer.invoke('db:createRun', runData, countryCodes, criteriaBrief),
  parseRun: (runId) => ipcRenderer.invoke('db:parseRun', runId),
  buildPlan: (runId) => ipcRenderer.invoke('db:buildPlan', runId),
  getRun: (runId) => ipcRenderer.invoke('db:getRun', runId),
  getRuns: (options) => ipcRenderer.invoke('db:getRuns', options),
  updateAgentStatus: (runId, agentNumber, statusUpdate) =>
    ipcRenderer.invoke('db:updateAgentStatus', runId, agentNumber, statusUpdate),

  /* Niches */
  getNichesByRun: (runId) => ipcRenderer.invoke('db:getNichesByRun', runId),

  /* KPI & Diagnostic Health */
  getCounts: () => ipcRenderer.invoke('db:getCounts'),
  getDbHealth: () => ipcRenderer.invoke('db:getDbHealth'),

  /* Generic CRUD */
  insert: (table, data) => ipcRenderer.invoke('db:insert', table, data),
  update: (table, idOrWhere, data) => ipcRenderer.invoke('db:update', table, idOrWhere, data),
  findBy: (table, where, options) => ipcRenderer.invoke('db:findBy', table, where, options),
  findOne: (table, where) => ipcRenderer.invoke('db:findOne', table, where),
  deleteBy: (table, where) => ipcRenderer.invoke('db:deleteBy', table, where),
  count: (table, where) => ipcRenderer.invoke('db:count', table, where),
});

contextBridge.exposeInMainWorld('engineAPI', {
  /* Slots & Concurrency (Pillar 2) */
  getSlots: () => ipcRenderer.invoke('engine:get-slots'),

  /* Shared Cache (Pillar 1) */
  getCacheStats: () => ipcRenderer.invoke('engine:get-cache-stats'),
  pruneCache: () => ipcRenderer.invoke('engine:prune-cache'),

  /* Global Rate Limiter (Pillar 3) */
  getRateLimiterTelemetry: () => ipcRenderer.invoke('engine:get-rate-limiter-telemetry'),

  /* Timing Logs (Pillar 7) */
  getTimingSummary: (runId) => ipcRenderer.invoke('engine:get-timing-summary', runId),
  getTimingLogs: (options) => ipcRenderer.invoke('engine:get-timing-logs', options),

  /* Live Logs Bus (P1.3e) */
  getRecentLogs: (options) => ipcRenderer.invoke('engine:get-recent-logs', options),
  clearLogs: () => ipcRenderer.invoke('engine:clear-logs'),

  /* Quality Supervisor (P1.3) */
  getQualityReviews: (runId, options) => ipcRenderer.invoke('engine:get-quality-reviews', runId, options),
  getQualitySummary: (runId) => ipcRenderer.invoke('engine:get-quality-summary', runId),

  /* Search & Scraping */
  searchGoogle: (params) => ipcRenderer.invoke('engine:search-google', params),

  /* Test Harness (Part 7) */
  runTest: (testName, args) => ipcRenderer.invoke('engine:run-test', testName, args),

  /* System Tests Runner (P1.3c) */
  listSystemTests: () => ipcRenderer.invoke('engine:list-system-tests'),
  runSystemTest: (fileName) => ipcRenderer.invoke('engine:run-system-test', fileName),
  onSystemTestLog: (cb) => on('engine:system-test-log', cb),

  /* Execution Chain (P1.2) */
  startRun: (runId, options) => ipcRenderer.invoke('engine:startRun', runId, options),
  approveRun: (runId, approvedNiches) => ipcRenderer.invoke('engine:approveRun', runId, approvedNiches),
  pauseRun: (runId) => ipcRenderer.invoke('engine:pauseRun', runId),
  cancelRun: (runId) => ipcRenderer.invoke('engine:cancelRun', runId),
  listAgents: () => ipcRenderer.invoke('engine:listAgents'),

  /* Real-time event streams (Part 4, 6, P1.2) */
  onLog: (cb) => on('engine:log', cb),
  onCaptchaDetected: (cb) => on('captcha:detected', cb),
  onCaptchaResolved: (cb) => on('captcha:resolved', cb),
  onSlotsUpdated: (cb) => on('slots:updated', cb),
  onRateLimiterWait: (cb) => on('rate-limiter:wait', cb),
  onRunStatus: (cb) => on('engine:run-status', cb),
  onAgentStatus: (cb) => on('engine:agent-status', cb),
});

contextBridge.exposeInMainWorld('llmAPI', {
  listProviders: () => ipcRenderer.invoke('llm:getProviders'),
  fetchModels: (providerId, apiKey) => ipcRenderer.invoke('llm:fetchModels', providerId, apiKey),
  validateModel: (params) => ipcRenderer.invoke('llm:validateModel', params),
  chat: (options) => ipcRenderer.invoke('llm:chat', options),
  checkModelStatus: () => ipcRenderer.invoke('llm:checkModelStatus'),
});

