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

module.exports = {
  registerDbIpc,
};
