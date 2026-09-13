'use strict';

/**
 * NRD · scheduler.js — Agent #4: Scheduler Agent (P1.4)
 * 
 * THE TIMING ENGINE OF THE NICHE RESEARCH DEPARTMENT.
 * 
 * Core Responsibilities:
 * 1. AUTOMATE RECURRING RESEARCH: Supports 'interval', 'daily', 'weekly', and 'cron' schedules.
 * 2. 30-SECOND TICK LOOP: Checks for due schedules using SQL index `(enabled, next_run_at)`.
 * 3. MISSED FIRINGS / CATCH-UP LOGIC:
 *    - If app was closed and next_run_at is in the past:
 *    - Runs ONE catch-up run immediately.
 *    - Fast-forwards `next_run_at` to the next future scheduled time (avoids queue cascades/storms).
 * 4. CONCURRENCY & GLOBAL BUDGET GUARD:
 *    - Respects max 1 active research run across the department.
 *    - If a run is actively executing, defers firing to next tick without advancing `next_run_at`.
 * 5. PIPELINE INTEGRATION:
 *    - Creates runs via `db.createRun` with trigger_source='scheduled' and schedule_id.
 *    - Automatically launches run in ChainEngine if auto-approve/auto-pipeline is configured.
 * 6. LOGGING & AUDITING:
 *    - Records every firing attempt in `schedule_firings`.
 *    - Emits live logs for mission control visibility.
 */

const db = require('../db');
const agentRegistry = require('../engine/agentRegistry');
const { emitLog } = require('../engine/logBus');

// ─────────────────────────────────────────────────────────────
// CRON EXPRESSION PARSER (Standard 5-part cron: min hour dom mon dow)
// ─────────────────────────────────────────────────────────────

/**
 * Matches a single cron field against a target value.
 * Supports: '*', exact number (e.g. '5'), list ('1,15,30'), range ('1-5'), step ('* / 15', '0-30/5').
 * @param {string} field
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function matchCronField(field, val, min, max) {
  if (field === '*' || field === '?') return true;

  const parts = field.split(',');
  for (const part of parts) {
    if (part.includes('/')) {
      const [rangeStr, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) continue;

      let start = min;
      let end = max;
      if (rangeStr !== '*' && rangeStr !== '') {
        if (rangeStr.includes('-')) {
          const [rStart, rEnd] = rangeStr.split('-');
          start = parseInt(rStart, 10);
          end = parseInt(rEnd, 10);
        } else {
          start = parseInt(rangeStr, 10);
        }
      }
      if (val >= start && val <= end && (val - start) % step === 0) {
        return true;
      }
    } else if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (val >= start && val <= end) return true;
    } else {
      const exact = parseInt(part, 10);
      if (exact === val) return true;
    }
  }

  return false;
}

/**
 * Validates whether a cron expression is a valid 5-part standard format.
 * @param {string} expr
 * @returns {boolean}
 */
function isValidCron(expr) {
  if (!expr || typeof expr !== 'string') return false;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return true;
}

/**
 * Calculates the next matching Date for a cron expression starting from `fromDate`.
 * Scans minute-by-minute up to 366 days in future.
 * @param {string} expr
 * @param {Date} [fromDate=new Date()]
 * @returns {Date}
 */
function computeNextCronDate(expr, fromDate = new Date()) {
  const parts = (expr || '').trim().split(/\s+/);
  if (parts.length !== 5) {
    // Fallback: 1 hour later
    return new Date(fromDate.getTime() + 60 * 60 * 1000);
  }

  const [minField, hourField, domField, monField, dowField] = parts;
  
  // Start from the next full minute (seconds = 0, ms = 0)
  const d = new Date(fromDate.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);

  const maxMinutesToScan = 366 * 24 * 60; // Max 1 year search
  for (let i = 0; i < maxMinutesToScan; i++) {
    const min = d.getMinutes();
    const hour = d.getHours();
    const dom = d.getDate();
    const mon = d.getMonth() + 1; // 1-12
    const dow = d.getDay(); // 0-6 (0=Sun)

    if (
      matchCronField(minField, min, 0, 59) &&
      matchCronField(hourField, hour, 0, 23) &&
      matchCronField(domField, dom, 1, 31) &&
      matchCronField(monField, mon, 1, 12) &&
      matchCronField(dowField, dow, 0, 6)
    ) {
      return d;
    }

    d.setMinutes(d.getMinutes() + 1);
  }

  // Fallback if not found in 1 year
  return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Computes the next run date for any schedule configuration.
 * Always returns a date strictly in the future relative to `baseDate`.
 * 
 * @param {object} schedule
 * @param {Date} [baseDate=new Date()]
 * @returns {string} ISO timestamp (e.g. 2026-09-13T12:00:00.000Z)
 */
function computeNextRunAt(schedule, baseDate = new Date()) {
  const type = schedule.schedule_type;
  const now = baseDate instanceof Date ? baseDate : new Date(baseDate);

  if (type === 'interval') {
    const mins = Math.max(1, parseInt(schedule.interval_minutes, 10) || 60);
    const nextDate = new Date(now.getTime() + mins * 60 * 1000);
    return nextDate.toISOString();
  }

  if (type === 'daily') {
    const timeStr = schedule.time_of_day || '00:00';
    const [hStr, mStr] = timeStr.split(':');
    const targetHour = parseInt(hStr, 10) || 0;
    const targetMin = parseInt(mStr, 10) || 0;

    const candidate = new Date(now);
    candidate.setHours(targetHour, targetMin, 0, 0);

    // If candidate time is today but already passed, schedule for tomorrow
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate.toISOString();
  }

  if (type === 'weekly') {
    const targetDow = schedule.day_of_week !== undefined && schedule.day_of_week !== null
      ? parseInt(schedule.day_of_week, 10)
      : 1; // Default Monday
    const timeStr = schedule.time_of_day || '00:00';
    const [hStr, mStr] = timeStr.split(':');
    const targetHour = parseInt(hStr, 10) || 0;
    const targetMin = parseInt(mStr, 10) || 0;

    const candidate = new Date(now);
    candidate.setHours(targetHour, targetMin, 0, 0);

    let daysToAdd = (targetDow - candidate.getDay() + 7) % 7;
    if (daysToAdd === 0 && candidate.getTime() <= now.getTime()) {
      daysToAdd = 7;
    }
    candidate.setDate(candidate.getDate() + daysToAdd);
    return candidate.toISOString();
  }

  if (type === 'cron') {
    const cronExpr = schedule.cron_expr || '0 0 * * *';
    const nextDate = computeNextCronDate(cronExpr, now);
    return nextDate.toISOString();
  }

  // Default fallback: 1 hour
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
}

/**
 * Fast-forwards `next_run_at` to a guaranteed future timestamp if it was in the past.
 * Prevents rapid repeated firings after app restarts or downtime.
 * 
 * @param {object} schedule
 * @param {Date} [now=new Date()]
 * @returns {string} Future ISO timestamp
 */
function fastForwardNextRun(schedule, now = new Date()) {
  let next = computeNextRunAt(schedule, now);
  const nowMs = now.getTime();
  let iterations = 0;

  while (new Date(next).getTime() <= nowMs && iterations < 500) {
    next = computeNextRunAt(schedule, new Date(next));
    iterations++;
  }

  if (new Date(next).getTime() <= nowMs) {
    next = new Date(nowMs + 60 * 1000).toISOString();
  }

  return next;
}

// ─────────────────────────────────────────────────────────────
// SCHEDULER ENGINE CLASS
// ─────────────────────────────────────────────────────────────

class SchedulerAgent {
  constructor() {
    this.timer = null;
    this.tickIntervalMs = 30000; // 30 seconds default
    this.isProcessing = false;
    this.chainEngine = null;
  }

  /**
   * Lazy load Chain Engine instance.
   */
  getChainEngine() {
    if (!this.chainEngine) {
      try {
        const { chainEngine } = require('../engine/chainEngine');
        this.chainEngine = chainEngine;
      } catch {
        this.chainEngine = null;
      }
    }
    return this.chainEngine;
  }

  /**
   * Starts the 30-second scheduler background loop.
   */
  start() {
    if (this.timer) return;
    emitLog('SCHEDULER', '⏱️ Scheduler Agent active — tick loop started (30s interval)');
    
    // Immediate initial tick
    this.tick().catch((err) => {
      console.error('[SchedulerAgent] Initial tick error:', err);
    });

    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error('[SchedulerAgent] Tick error:', err);
      });
    }, this.tickIntervalMs);

    if (this.timer.unref) {
      this.timer.unref(); // Allow Node process to exit gracefully in tests/shutdown
    }
  }

  /**
   * Stops the background loop.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      emitLog('SCHEDULER', '⏹️ Scheduler Agent stopped');
    }
  }

  /**
   * Main evaluation loop: fetches due schedules and processes them.
   * @returns {Promise<{ dueCount: number, firedCount: number, deferredCount: number }>}
   */
  async tick() {
    if (this.isProcessing) return { dueCount: 0, firedCount: 0, deferredCount: 0 };
    this.isProcessing = true;

    try {
      const dbInstance = db.getDb();
      const nowIso = new Date().toISOString();

      // Query enabled schedules where next_run_at <= now
      const dueSchedules = dbInstance.prepare(`
        SELECT * FROM schedules 
        WHERE enabled = 1 AND next_run_at <= ? 
        ORDER BY next_run_at ASC
      `).all(nowIso);

      if (dueSchedules.length === 0) {
        return { dueCount: 0, firedCount: 0, deferredCount: 0 };
      }

      let firedCount = 0;
      let deferredCount = 0;

      for (const schedule of dueSchedules) {
        // Concurrency Guard: check if any run is currently active
        const isBusy = this.isDepartmentBusy();
        if (isBusy) {
          emitLog('SCHEDULER', `⏳ Schedule "${schedule.name}" (ID #${schedule.id}) deferred — active run in progress`, {
            scheduleId: schedule.id,
          });
          deferredCount++;
          // Defer firing to next tick without advancing next_run_at
          continue;
        }

        // Fire the schedule!
        const result = await this.fireSchedule(schedule);
        if (result.success) {
          firedCount++;
        }
      }

      return {
        dueCount: dueSchedules.length,
        firedCount,
        deferredCount,
      };
    } catch (err) {
      console.error('[SchedulerAgent] Tick error:', err);
      emitLog('SCHEDULER', `⚠️ Scheduler tick error: ${err.message}`);
      return { dueCount: 0, firedCount: 0, deferredCount: 0, error: err.message };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Checks if any run is actively executing across the department.
   * @returns {boolean}
   */
  isDepartmentBusy() {
    // 1. Check in-memory activeRuns in ChainEngine (actively processing)
    const ce = this.getChainEngine();
    if (ce && ce.activeRuns && ce.activeRuns.size > 0) {
      return true;
    }

    // 2. Check DB for runs currently in mid-execution active phases
    try {
      const dbInstance = db.getDb();
      const activeRow = dbInstance.prepare(`
        SELECT COUNT(*) as active_cnt 
        FROM research_runs 
        WHERE status IN ('discovery', 'deep_research', 'scoring', 'qa', 'reporting')
      `).get();
      return (activeRow?.active_cnt || 0) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Fires a single schedule: creates a run, records the firing, fast-forwards next_run_at, and starts the chain.
   * @param {object} schedule
   * @returns {Promise<{ success: boolean, runId?: number, error?: string }>}
   */
  async fireSchedule(schedule) {
    const dbInstance = db.getDb();
    const firedAt = new Date().toISOString();
    let runConfig = {};

    try {
      runConfig = typeof schedule.run_config_json === 'string'
        ? JSON.parse(schedule.run_config_json)
        : (schedule.run_config_json || {});
    } catch {
      runConfig = {};
    }

    const runName = runConfig.run_name || `${schedule.name} (Auto)`;
    const countryCodes = Array.isArray(runConfig.country_codes) && runConfig.country_codes.length > 0
      ? runConfig.country_codes
      : ['US'];

    emitLog('SCHEDULER', `🚀 Firing schedule "${schedule.name}" (ID #${schedule.id}) -> creating run "${runName}"`, {
      scheduleId: schedule.id,
    });

    try {
      // 1. Create run using standard createRun pipeline
      const runPayload = {
        run_name: runName,
        input_mode: runConfig.input_mode || 'discovery',
        business_modes: runConfig.business_modes || ['blogging'],
        niche_quantity: runConfig.niche_quantity || 1,
        own_niche_name: runConfig.own_niche_name || null,
        domain: runConfig.domain || null,
        competition_level: runConfig.competition_level || 'medium',
        status: 'pending',
        approval_gate_passed: runConfig.auto_approve ? 1 : 0,
        auto_approve: runConfig.auto_approve ? 1 : 0,
        trigger_source: 'scheduler',
        schedule_id: schedule.id,
      };

      const runObj = db.createRun(runPayload, countryCodes, {});
      const runId = (runObj && typeof runObj === 'object') ? runObj.id : runObj;

      // 2. Compute the next run date strictly in future (catch-up safety)
      const nextRunAt = fastForwardNextRun(schedule, new Date());

      // 3. Update schedules table: last_run_at, next_run_at, last_run_id, updated_at
      dbInstance.prepare(`
        UPDATE schedules 
        SET last_run_at = ?, next_run_at = ?, last_run_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(firedAt, nextRunAt, runId, schedule.id);

      // 4. Record firing log in schedule_firings table
      dbInstance.prepare(`
        INSERT INTO schedule_firings (schedule_id, run_id, fired_at, status, error)
        VALUES (?, ?, ?, 'launched', NULL)
      `).run(schedule.id, runId, firedAt);

      emitLog('SCHEDULER', `✅ Schedule #${schedule.id} launched Run #${runId} — next run at ${nextRunAt}`, {
        scheduleId: schedule.id,
        runId,
        nextRunAt,
      });

      // 5. Start run in ChainEngine
      const ce = this.getChainEngine();
      if (ce && typeof ce.startRun === 'function') {
        ce.startRun(runId).catch((err) => {
          console.error(`[SchedulerAgent] Error executing chain for Run #${runId}:`, err);
        });
      }

      return { success: true, runId, nextRunAt };
    } catch (err) {
      console.error(`[SchedulerAgent] Failed firing schedule #${schedule.id}:`, err);
      
      // Calculate next run date to avoid stuck loops
      const nextRunAt = fastForwardNextRun(schedule, new Date());
      
      dbInstance.prepare(`
        UPDATE schedules 
        SET next_run_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(nextRunAt, schedule.id);

      dbInstance.prepare(`
        INSERT INTO schedule_firings (schedule_id, run_id, fired_at, status, error)
        VALUES (?, NULL, ?, 'failed', ?)
      `).run(schedule.id, firedAt, err.message);

      emitLog('SCHEDULER', `❌ Failed firing schedule #${schedule.id}: ${err.message}`, {
        scheduleId: schedule.id,
        error: err.message,
      });

      return { success: false, error: err.message };
    }
  }

  /**
   * Manually triggers a schedule immediately out-of-band.
   * @param {number} scheduleId
   * @returns {Promise<{ success: boolean, runId?: number, error?: string }>}
   */
  async runNow(scheduleId) {
    const dbInstance = db.getDb();
    const schedule = dbInstance.prepare('SELECT * FROM schedules WHERE id = ?').get(Number(scheduleId));
    if (!schedule) {
      throw new Error(`Schedule #${scheduleId} not found.`);
    }

    if (this.isDepartmentBusy()) {
      throw new Error('Department is currently executing another research run. Concurrency limit is 1.');
    }

    return await this.fireSchedule(schedule);
  }

  /**
   * Creates a new schedule record.
   * @param {object} data
   * @returns {object} The created schedule
   */
  createSchedule(data) {
    const dbInstance = db.getDb();
    if (!data.name || !data.name.trim()) {
      throw new Error('Schedule name is required.');
    }

    const type = data.schedule_type || 'interval';
    if (!['interval', 'daily', 'weekly', 'cron'].includes(type)) {
      throw new Error(`Invalid schedule_type: ${type}`);
    }

    if (type === 'cron' && !isValidCron(data.cron_expr)) {
      throw new Error('Invalid cron expression. Expected 5 parts (e.g. "0 0 * * *").');
    }

    const runConfigObj = data.run_config || {
      run_name: `${data.name} (Auto)`,
      input_mode: 'discovery',
      business_modes: ['blogging'],
      niche_quantity: 1,
      country_codes: ['US'],
      auto_approve: true,
    };

    const runConfigJson = typeof runConfigObj === 'string' ? runConfigObj : JSON.stringify(runConfigObj);
    const enabled = data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1;

    const scheduleData = {
      name: data.name.trim(),
      enabled,
      schedule_type: type,
      interval_minutes: data.interval_minutes ? parseInt(data.interval_minutes, 10) : null,
      time_of_day: data.time_of_day || null,
      day_of_week: data.day_of_week !== undefined && data.day_of_week !== null ? parseInt(data.day_of_week, 10) : null,
      cron_expr: data.cron_expr ? data.cron_expr.trim() : null,
      run_config_json: runConfigJson,
    };

    const nextRunAt = computeNextRunAt(scheduleData, new Date());

    const result = dbInstance.prepare(`
      INSERT INTO schedules (name, enabled, schedule_type, interval_minutes, time_of_day, day_of_week, cron_expr, run_config_json, next_run_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      scheduleData.name,
      scheduleData.enabled,
      scheduleData.schedule_type,
      scheduleData.interval_minutes,
      scheduleData.time_of_day,
      scheduleData.day_of_week,
      scheduleData.cron_expr,
      scheduleData.run_config_json,
      nextRunAt
    );

    const createdId = result.lastInsertRowid;
    emitLog('SCHEDULER', `➕ Created schedule "${scheduleData.name}" (ID #${createdId}) — next run at ${nextRunAt}`, {
      scheduleId: createdId,
    });

    return db.getSchedule(createdId);
  }

  /**
   * Updates an existing schedule record.
   * @param {number} scheduleId
   * @param {object} patch
   * @returns {object} The updated schedule
   */
  updateSchedule(scheduleId, patch = {}) {
    const dbInstance = db.getDb();
    const existing = dbInstance.prepare('SELECT * FROM schedules WHERE id = ?').get(Number(scheduleId));
    if (!existing) {
      throw new Error(`Schedule #${scheduleId} not found.`);
    }

    const updated = {
      ...existing,
      ...patch,
    };

    if (patch.run_config) {
      updated.run_config_json = typeof patch.run_config === 'string'
        ? patch.run_config
        : JSON.stringify(patch.run_config);
    }

    if (patch.enabled !== undefined) {
      updated.enabled = patch.enabled ? 1 : 0;
    }

    // Recalculate next_run_at if timing or status changed
    let nextRunAt = updated.next_run_at;
    if (
      patch.schedule_type !== undefined ||
      patch.interval_minutes !== undefined ||
      patch.time_of_day !== undefined ||
      patch.day_of_week !== undefined ||
      patch.cron_expr !== undefined ||
      (patch.enabled && !existing.enabled)
    ) {
      nextRunAt = computeNextRunAt(updated, new Date());
    }

    dbInstance.prepare(`
      UPDATE schedules 
      SET name = ?, enabled = ?, schedule_type = ?, interval_minutes = ?, time_of_day = ?, day_of_week = ?, cron_expr = ?, run_config_json = ?, next_run_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updated.name,
      updated.enabled,
      updated.schedule_type,
      updated.interval_minutes,
      updated.time_of_day,
      updated.day_of_week,
      updated.cron_expr,
      updated.run_config_json,
      nextRunAt,
      scheduleId
    );

    emitLog('SCHEDULER', `✏️ Updated schedule #${scheduleId} ("${updated.name}")`, { scheduleId });

    return db.getSchedule(scheduleId);
  }

  /**
   * Deletes a schedule and its firings.
   * @param {number} scheduleId
   * @returns {boolean}
   */
  deleteSchedule(scheduleId) {
    const dbInstance = db.getDb();
    const id = Number(scheduleId);
    dbInstance.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    emitLog('SCHEDULER', `🗑️ Deleted schedule #${id}`, { scheduleId: id });
    return true;
  }
}

const schedulerInstance = new SchedulerAgent();

/* ══════════════════════════════════════════════════════════════
   REGISTER AGENT #4 IN AGENT REGISTRY
   ══════════════════════════════════════════════════════════════ */
agentRegistry.register(
  4,
  'Scheduler Agent',
  'control',
  async (context) => {
    emitLog('SCHEDULER', '⚙️ Executing Scheduler Agent check', { runId: context.runId });
    const tickResult = await schedulerInstance.tick();
    return {
      status: 'success',
      agent: 'Scheduler Agent',
      agent_number: 4,
      due_schedules_count: tickResult.dueCount || 0,
      fired_count: tickResult.firedCount || 0,
      deferred_count: tickResult.deferredCount || 0,
      timestamp: new Date().toISOString(),
    };
  },
  {
    inputs: ['schedules_table', 'current_time'],
    outputs: ['triggered_runs', 'schedule_firings'],
    isCritical: false,
    desc: 'Automates recurring research runs on interval, daily, weekly, or cron cadences.',
  }
);

module.exports = {
  scheduler: schedulerInstance,
  SchedulerAgent,
  computeNextRunAt,
  computeNextCronDate,
  fastForwardNextRun,
  isValidCron,
};
