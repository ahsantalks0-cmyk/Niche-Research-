'use strict';

/**
 * NRD · ipc.js — IPC Handlers Bridge for SQLite Database Operations.
 * Registers ipcMain.handle listeners for database queries and transactions.
 */

const { ipcMain } = require('electron');
const db = require('./db');

/**
 * Registers all database IPC handlers on the main process.
 */
function registerDbIpc() {
  // Settings
  ipcMain.handle('db:getSettings', () => {
    return db.getSettings();
  });

  ipcMain.handle('db:saveSettings', (_e, patch) => {
    return db.saveSettings(patch);
  });

  // Countries
  ipcMain.handle('db:getCountries', (_e, activeOnly) => {
    return db.getCountries(!!activeOnly);
  });

  // Runs
  ipcMain.handle('db:createRun', (_e, runData, countryCodes, criteriaBrief) => {
    return db.createRun(runData, countryCodes, criteriaBrief);
  });

  ipcMain.handle('db:getRun', (_e, runId) => {
    return db.getRun(runId);
  });

  ipcMain.handle('db:getRuns', (_e, options) => {
    return db.getRuns(options);
  });

  ipcMain.handle('db:parseRun', (_e, runId) => {
    return db.parseRun(runId);
  });

  // Department Head & Chain Engine (P1.2)
  ipcMain.handle('db:buildPlan', (_e, runId) => {
    const { buildPlan } = require('./agents/departmentHead');
    return buildPlan(runId);
  });

  ipcMain.handle('engine:startRun', (_e, runId, options) => {
    const { chainEngine } = require('./engine/chainEngine');
    return chainEngine.startRun(runId, options);
  });

  ipcMain.handle('engine:approveRun', (_e, runId, approvedNiches) => {
    const { chainEngine } = require('./engine/chainEngine');
    return chainEngine.approveRun(runId, approvedNiches);
  });

  ipcMain.handle('engine:pauseRun', (_e, runId) => {
    const { chainEngine } = require('./engine/chainEngine');
    return chainEngine.pauseRun(runId);
  });

  ipcMain.handle('engine:cancelRun', (_e, runId) => {
    const { chainEngine } = require('./engine/chainEngine');
    return chainEngine.cancelRun(runId);
  });

  ipcMain.handle('engine:listAgents', () => {
    const agentRegistry = require('./engine/agentRegistry');
    return agentRegistry.listAll();
  });

  ipcMain.handle('db:updateAgentStatus', (_e, runId, agentNumber, statusUpdate) => {
    return db.updateAgentStatus(runId, agentNumber, statusUpdate);
  });

  // Niches
  ipcMain.handle('db:getNichesByRun', (_e, runId) => {
    return db.getNichesByRun(runId);
  });

  // KPI & Health
  ipcMain.handle('db:getCounts', () => {
    return db.getCounts();
  });

  ipcMain.handle('db:getDbHealth', () => {
    return db.getDbHealth();
  });

  // Generic CRUD helpers for future agent prompts
  ipcMain.handle('db:insert', (_e, table, data) => {
    return db.insert(table, data);
  });

  ipcMain.handle('db:update', (_e, table, idOrWhere, data) => {
    return db.update(table, idOrWhere, data);
  });

  ipcMain.handle('db:findBy', (_e, table, where, options) => {
    return db.findBy(table, where, options);
  });

  ipcMain.handle('db:findOne', (_e, table, where) => {
    return db.findOne(table, where);
  });

  ipcMain.handle('db:deleteBy', (_e, table, where) => {
    return db.deleteBy(table, where);
  });

  ipcMain.handle('db:count', (_e, table, where) => {
    return db.count(table, where);
  });
}

/**
 * Registers all Browser Engine IPC handlers and event forwards.
 * @param {import('electron').BrowserWindow} mainWindow
 */
function registerEngineIpc(mainWindow) {
  const {
    browserEngine,
    engineCache,
    rateLimiter,
    slotPool,
    testHarness,
  } = require('./engine');

  // Slots & Concurrency (Pillar 2)
  ipcMain.handle('engine:get-slots', () => {
    return slotPool.getSnapshot();
  });

  // Shared Page/Data Cache (Pillar 1)
  ipcMain.handle('engine:get-cache-stats', () => {
    return engineCache.getStats();
  });

  ipcMain.handle('engine:prune-cache', () => {
    return engineCache.prune();
  });

  // Global Rate Limiter (Pillar 3)
  ipcMain.handle('engine:get-rate-limiter-telemetry', () => {
    return rateLimiter.getTelemetry();
  });

  // Timing Logs (Pillar 7)
  ipcMain.handle('engine:get-timing-summary', (_e, runId) => {
    return db.getTimingSummary(runId || null);
  });

  ipcMain.handle('engine:get-timing-logs', (_e, options) => {
    return db.getTimingLogs(options || {});
  });

  // Quality Supervisor (P1.3)
  ipcMain.handle('engine:get-quality-reviews', (_e, runId, options) => {
    return db.getQualityReviews(runId || null, options || {});
  });

  ipcMain.handle('engine:get-quality-summary', (_e, runId) => {
    return db.getQualitySummary(runId);
  });

  // Browser Operations
  ipcMain.handle('engine:search-google', (_e, params) => {
    return browserEngine.searchGoogle(params);
  });

  // Engine Test Harness (Part 7)
  ipcMain.handle('engine:run-test', async (_e, testName, args) => {
    switch (testName) {
      case 'google-searches':
        return await testHarness.runGoogleSearchesTest(args?.queries);
      case 'parallel-slots':
        return await testHarness.runParallelSlotsTest();
      case 'cache':
        return await testHarness.runCacheTest(args?.keyword);
      case 'rate-limiter':
        return await testHarness.runRateLimiterTest();
      case 'timing-summary':
        return await testHarness.runTimingSummaryTest(args?.runId);
      case 'browser-isolation':
        return await testHarness.runBrowserIsolationTest();
      case 'captcha-alert':
        // Test CAPTCHA alert trigger
        browserEngine.emit('captcha:detected', {
          slotId: 2,
          domain: 'google.com',
          url: 'https://www.google.com/sorry/index?continue=...',
          timestamp: new Date().toISOString(),
          isTest: true,
        });
        return { success: true, message: 'Simulated CAPTCHA alert triggered on Slot #2' };
      default:
        throw new Error(`Unknown engine test: ${testName}`);
    }
  });

  // Forward engine events to renderer for Live Logs & CAPTCHA banner
  const sendToRenderer = (channel, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  };

  // System Tests Runner (P1.3c)
  const systemTests = require('./engine/systemTests');
  ipcMain.handle('engine:list-system-tests', () => {
    return systemTests.listSystemTests();
  });

  ipcMain.handle('engine:run-system-test', async (_e, fileName) => {
    return await systemTests.runSystemTest(fileName, (chunk) => {
      sendToRenderer('engine:system-test-log', { fileName, chunk });
    });
  });

  // Multi-Provider LLM Engine (P1.3c)
  const llmClient = require('./llm/llmClient');
  llmClient.initAutoRefresh();

  ipcMain.handle('llm:getProviders', () => {
    return llmClient.listProviders();
  });

  ipcMain.handle('llm:fetchModels', async (_e, providerId, apiKey) => {
    return await llmClient.fetchModels(providerId, apiKey);
  });

  ipcMain.handle('llm:validateModel', async (_e, params) => {
    return await llmClient.validateModel(params);
  });

  ipcMain.handle('llm:chat', async (_e, options) => {
    return await llmClient.chat(options);
  });

  ipcMain.handle('llm:checkModelStatus', async () => {
    return await llmClient.checkSelectedModelStatus();
  });

  const { chainEngine } = require('./engine/chainEngine');

  browserEngine.on('log', (entry) => sendToRenderer('engine:log', entry));
  browserEngine.on('captcha:detected', (data) => sendToRenderer('captcha:detected', data));
  browserEngine.on('captcha:resolved', (data) => sendToRenderer('captcha:resolved', data));
  slotPool.on('slots:updated', (data) => sendToRenderer('slots:updated', data));
  rateLimiter.on('wait', (data) => sendToRenderer('rate-limiter:wait', data));
  chainEngine.on('run:status', (data) => sendToRenderer('engine:run-status', data));
  chainEngine.on('agent:status', (data) => sendToRenderer('engine:agent-status', data));
}

module.exports = {
  registerDbIpc,
  registerEngineIpc,
};
