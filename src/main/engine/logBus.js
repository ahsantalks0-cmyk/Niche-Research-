'use strict';

/**
 * NRD · engine/logBus.js — Master Live Telemetry & Log Event Bus.
 * 
 * ROLE:
 * Single centralized event bus for all telemetry across the Niche Research Department.
 * 
 * FEATURES:
 * 1. Standardized category tagging: AGENT | CHAIN | QS | LLM | BROWSER | CACHE | RATE LIMIT | CAPTCHA | TIMING
 * 2. In-memory ring buffer (up to 2000 entries) for live retrieval, search, and export
 * 3. Automatic ISO timestamps and structured metadata
 * 4. Broadcasts to all Electron renderer windows via webContents.send('engine:log', entry)
 * 5. Event emitter hooks for dev server (SSE / HTTP bridge) and programmatic tests
 */

const { EventEmitter } = require('node:events');
const db = require('../db');

const VALID_CATEGORIES = [
  'AGENT',
  'CHAIN',
  'QS',
  'LLM',
  'BROWSER',
  'CACHE',
  'RATE LIMIT',
  'CAPTCHA',
  'TIMING',
];

const RING_BUFFER_MAX = 2000;

class LogBus extends EventEmitter {
  constructor() {
    super();
    this.buffer = [];
    this.counter = 0;
  }

  /**
   * Normalizes category string to one of the 9 official categories.
   * @param {string} category
   * @returns {string}
   */
  normalizeCategory(category) {
    if (!category) return 'BROWSER';
    const c = String(category).trim().toUpperCase();
    if (VALID_CATEGORIES.includes(c)) return c;
    if (c.includes('AGENT')) return 'AGENT';
    if (c.includes('CHAIN')) return 'CHAIN';
    if (c.includes('QS') || c.includes('QUALITY')) return 'QS';
    if (c.includes('LLM') || c.includes('AI')) return 'LLM';
    if (c.includes('CACHE')) return 'CACHE';
    if (c.includes('RATE')) return 'RATE LIMIT';
    if (c.includes('CAPTCHA')) return 'CAPTCHA';
    if (c.includes('TIMING')) return 'TIMING';
    return 'BROWSER';
  }

  /**
   * Emits a structured log event to the bus, ring buffer, console, and renderer windows.
   * 
   * @param {string} rawCategory
   * @param {string} message
   * @param {object} [meta={}]
   * @returns {object} The created log entry
   */
  emitLog(rawCategory, message, meta = {}) {
    const category = this.normalizeCategory(rawCategory);
    const timestamp = meta.timestamp || new Date().toISOString();
    const id = ++this.counter;
    const msg = String(message || '');

    let level = meta.level || 'info';
    if (!meta.level) {
      if (msg.includes('🚨') || msg.includes('❌') || msg.includes('💥') || category === 'CAPTCHA') {
        level = 'error';
      } else if (msg.includes('⚠️') || msg.includes('🔁') || category === 'RATE LIMIT') {
        level = 'warn';
      }
    }

    const entry = {
      id,
      timestamp,
      category,
      level,
      message: msg,
      slotId: meta.slotId !== undefined ? meta.slotId : null,
      runId: meta.runId !== undefined ? meta.runId : null,
      agentNumber: meta.agentNumber !== undefined ? meta.agentNumber : null,
      details: meta.details || null,
      ...meta,
    };

    // 1. Persist to live_logs SQLite table
    try {
      if (typeof db.insertLiveLog === 'function') {
        const rowId = db.insertLiveLog({
          ts: timestamp,
          category,
          message: msg,
          meta: {
            level,
            slotId: entry.slotId,
            runId: entry.runId,
            agentNumber: entry.agentNumber,
            ...meta,
          },
        });
        if (rowId) entry.dbId = rowId;
      }
    } catch (err) {
      // Non-fatal database persistence error
    }

    // 2. Push to in-memory ring buffer
    this.buffer.push(entry);
    if (this.buffer.length > RING_BUFFER_MAX) {
      this.buffer.shift();
    }

    // 3. Emit event on EventEmitter
    this.emit('log', entry);

    // 4. Print to console stdout
    const prefix = `[NRD · ${category}]`;
    console.log(`${prefix} ${msg}`);

    // 5. Broadcast to Electron renderer windows
    try {
      if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
        const { BrowserWindow } = require('electron');
        if (BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
          const windows = BrowserWindow.getAllWindows();
          for (const win of windows) {
            if (win && !win.isDestroyed()) {
              win.webContents.send('engine:log', entry);
            }
          }
        }
      }
    } catch {
      // Running outside Electron
    }

    return entry;
  }

  /**
   * Returns recent log entries from the database (survives restarts/navigation),
   * falling back to in-memory ring buffer if needed.
   * @param {object} [options={}]
   * @param {number} [options.limit=500]
   * @param {string} [options.category]
   * @param {number} [options.runId]
   * @returns {Array<object>}
   */
  getRecentLogs(options = {}) {
    try {
      if (typeof db.getLiveLogs === 'function') {
        const dbLogs = db.getLiveLogs(options);
        if (Array.isArray(dbLogs) && dbLogs.length > 0) {
          if (options.runId) {
            return dbLogs.filter((e) => Number(e.runId) === Number(options.runId));
          }
          return dbLogs;
        }
      }
    } catch {
      // Fallback to in-memory ring buffer
    }

    const limit = Math.min(Number(options.limit) || 100, RING_BUFFER_MAX);
    let items = this.buffer;

    if (options.category && options.category !== 'ALL') {
      const cat = this.normalizeCategory(options.category);
      items = items.filter((e) => e.category === cat);
    }

    if (options.runId) {
      items = items.filter((e) => Number(e.runId) === Number(options.runId));
    }

    return items.slice(-limit);
  }

  /**
   * Clears in-memory ring buffer and deletes all records from live_logs table.
   */
  clear() {
    this.buffer = [];
    try {
      if (typeof db.clearLiveLogs === 'function') {
        db.clearLiveLogs();
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Formats logs into exportable text (pulls from DB if available, otherwise buffer).
   * @returns {string}
   */
  exportText() {
    try {
      if (typeof db.getAllLiveLogs === 'function') {
        const rows = db.getAllLiveLogs();
        if (Array.isArray(rows) && rows.length > 0) {
          return rows
            .map((e) => `[${e.timestamp}] [${e.category}] ${e.slotId ? `[Slot #${e.slotId}] ` : ''}${e.message}`)
            .join('\n');
        }
      }
    } catch {}

    return this.buffer
      .map((e) => `[${e.timestamp}] [${e.category}] ${e.slotId ? `[Slot #${e.slotId}] ` : ''}${e.message}`)
      .join('\n');
  }
}

const logBus = new LogBus();

// Auto-prune on startup and periodically (every 10 minutes)
try {
  if (typeof db.pruneLiveLogs === 'function') {
    db.pruneLiveLogs(2000);
  }
} catch {}

setInterval(() => {
  try {
    if (typeof db.pruneLiveLogs === 'function') {
      db.pruneLiveLogs(2000);
    }
  } catch {}
}, 10 * 60 * 1000);

module.exports = {
  logBus,
  emitLog: (category, message, meta) => logBus.emitLog(category, message, meta),
  VALID_CATEGORIES,
};
