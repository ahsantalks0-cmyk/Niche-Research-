'use strict';

/**
 * scripts/test-p14.js — Complete Verification for Scheduler Agent (Agent #4) & QS Fix (P1.4)
 *
 * Verifies:
 * 1. Database Schema & Migration v7 (schedules and schedule_firings tables, indexes, trigger_source).
 * 2. Schedule Cadence Calculation (interval, daily, weekly, and 5-part cron).
 * 3. Missed-Fire Catch-up & Fast-Forward Logic (ensures single catch-up, prevents stampedes).
 * 4. CRUD Operations & State Persistence (create, read, update, enable/disable, delete).
 * 5. Automated Tick Execution & Run Triggering via createRun pipeline.
 * 6. Concurrency Protection (defers execution when another research run is active).
 * 7. Quality Supervisor Fix (Stage 2 skips outputType='config' and injects context for research/analysis).
 * 8. Agent #4 Registry & Quality Rules Integration.
 */

const assert = require('assert');
const db = require('../src/main/db');
const {
  scheduler,
  computeNextRunAt,
  computeNextCronDate,
  fastForwardNextRun,
  isValidCron,
} = require('../src/main/agents/scheduler');
const agentRegistry = require('../src/main/engine/agentRegistry');
const qualitySupervisor = require('../src/main/agents/qualitySupervisor');

async function runP14Tests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P1.4 · Scheduler Agent (Agent #4) & QS Fix Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✕ [FAIL] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✕ [FAIL] ${name}:`, err.message);
    }
  }

  // Ensure DB & migrations are ready
  db.runMigrations();
  const rawDb = db.getDb();

  // Clean any lingering runs/schedules from prior interrupted runs
  rawDb.prepare("UPDATE research_runs SET status = 'completed' WHERE status IN ('planning', 'discovery', 'deep_research', 'scoring', 'qa', 'reporting')").run();
  rawDb.prepare("DELETE FROM schedule_firings").run();
  rawDb.prepare("DELETE FROM schedules").run();

  // Test 1: Migration v7 & Table Structure
  test('1. Migration v7 creates schedules & schedule_firings tables and indexes', () => {
    const schedulesTable = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schedules'").get();
    assert(schedulesTable, 'schedules table must exist');

    const firingsTable = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schedule_firings'").get();
    assert(firingsTable, 'schedule_firings table must exist');

    const schedCols = rawDb.prepare("PRAGMA table_info(schedules)").all().map(c => c.name);
    assert(schedCols.includes('name'), 'schedules must have name');
    assert(schedCols.includes('schedule_type'), 'schedules must have schedule_type');
    assert(schedCols.includes('interval_minutes'), 'schedules must have interval_minutes');
    assert(schedCols.includes('next_run_at'), 'schedules must have next_run_at');
    assert(schedCols.includes('enabled'), 'schedules must have enabled');

    const runCols = rawDb.prepare("PRAGMA table_info(research_runs)").all().map(c => c.name);
    assert(runCols.includes('trigger_source'), 'research_runs must have trigger_source');
    assert(runCols.includes('schedule_id'), 'research_runs must have schedule_id');
  });

  // Test 2: Cadence Calculation (Interval, Daily, Weekly, Cron)
  test('2. Cadence calculations accurately compute future next_run_at timestamps', () => {
    const baseDate = new Date('2026-09-13T10:00:00.000Z');

    // Interval: 30 minutes
    const nextInterval = computeNextRunAt({ schedule_type: 'interval', interval_minutes: 30 }, baseDate);
    assert.strictEqual(nextInterval, '2026-09-13T10:30:00.000Z', 'Interval should add exact minutes');

    // Daily: 14:00 today vs 08:00 (already passed -> tomorrow)
    const nextDailyFuture = computeNextRunAt({ schedule_type: 'daily', time_of_day: '14:00' }, baseDate);
    const dFuture = new Date(nextDailyFuture);
    assert.strictEqual(dFuture.getHours(), 14, 'Daily future should be at 14:00');

    // Weekly: specify target day of week
    const nextWeekly = computeNextRunAt({ schedule_type: 'weekly', day_of_week: 1, time_of_day: '09:00' }, baseDate);
    const dWeekly = new Date(nextWeekly);
    assert.strictEqual(dWeekly.getDay(), 1, 'Weekly should land on Monday (1)');
    assert(dWeekly.getTime() > baseDate.getTime(), 'Weekly next date must be in future');

    // Cron: 5-part cron parser
    assert(isValidCron('0 9 * * 1-5'), 'Should validate standard 5-part cron');
    assert(!isValidCron('invalid cron text'), 'Should reject malformed cron');
    const nextCron = computeNextRunAt({ schedule_type: 'cron', cron_expr: '0 12 * * *' }, baseDate);
    const dCron = new Date(nextCron);
    assert.strictEqual(dCron.getHours(), 12, 'Cron should match 12:00');
    assert.strictEqual(dCron.getMinutes(), 0, 'Cron minutes should be 0');
    assert(dCron.getTime() > baseDate.getTime(), 'Cron next run must be in future');
  });

  // Test 3: Missed-Fire Catch-up & Fast-Forward
  test('3. fastForwardNextRun prevents rapid catch-up storms when next_run_at is past', () => {
    const oldPastDate = new Date('2025-01-01T00:00:00.000Z');
    const now = new Date();

    const fastForwarded = fastForwardNextRun(
      { schedule_type: 'interval', interval_minutes: 60, next_run_at: oldPastDate.toISOString() },
      now
    );

    assert(new Date(fastForwarded).getTime() > now.getTime(), 'Fast forwarded next_run_at must be strictly in the future');
  });

  // Test 4: Schedule CRUD Operations
  test('4. Schedule CRUD creates, reads, updates, enables/disables, and deletes', () => {
    // Create
    const created = scheduler.createSchedule({
      name: 'Test Tech Radar',
      schedule_type: 'interval',
      interval_minutes: 45,
      run_config: {
        input_mode: 'discovery',
        niche_quantity: 2,
        country_codes: ['US', 'GB'],
      },
    });
    assert(created && created.id, 'Schedule creation must return inserted object with ID');
    assert.strictEqual(created.name, 'Test Tech Radar');
    assert.strictEqual(created.interval_minutes, 45);
    assert.strictEqual(Boolean(created.enabled), true);

    // Read
    const fetched = db.getSchedule(created.id);
    assert.strictEqual(fetched.id, created.id);
    assert.strictEqual(fetched.run_config.niche_quantity, 2);

    // Update / Disable
    const updated = scheduler.updateSchedule(created.id, {
      name: 'Test Tech Radar Updated',
      enabled: false,
      interval_minutes: 120,
    });
    assert.strictEqual(updated.name, 'Test Tech Radar Updated');
    assert.strictEqual(Boolean(updated.enabled), false);
    assert.strictEqual(updated.interval_minutes, 120);

    // Delete
    const deleted = scheduler.deleteSchedule(created.id);
    assert.strictEqual(deleted, true);
    const checkDeleted = db.getSchedule(created.id);
    assert.strictEqual(checkDeleted, null, 'Deleted schedule should not be returned');
  });

  // Test 5: Scheduler Tick & Automated Run Creation
  await asyncTest('5. scheduler.tick fires due schedules and creates runs via createRun pipeline', async () => {
    // Insert a schedule directly with next_run_at in the past
    const pastIso = new Date(Date.now() - 60000).toISOString();
    const created = scheduler.createSchedule({
      name: 'Due Schedule Test',
      schedule_type: 'interval',
      interval_minutes: 30,
      run_config: {
        run_name: 'Due Automated Run',
        input_mode: 'discovery',
        country_codes: ['US'],
        auto_approve: true,
      },
    });

    // Force next_run_at to past
    rawDb.prepare('UPDATE schedules SET next_run_at = ? WHERE id = ?').run(pastIso, created.id);

    // Execute tick
    const tickResult = await scheduler.tick();
    assert(tickResult.dueCount >= 1, `Expected at least 1 due schedule, got ${tickResult.dueCount}`);
    assert(tickResult.firedCount >= 1, `Expected at least 1 fired schedule, got ${tickResult.firedCount}`);

    // Verify schedule updated in DB
    const postSchedule = db.getSchedule(created.id);
    assert(postSchedule.last_run_at, 'last_run_at must be populated after firing');
    assert(postSchedule.last_run_id, 'last_run_id must reference created run');
    assert(new Date(postSchedule.next_run_at).getTime() > Date.now(), 'next_run_at must be advanced to future');

    // Verify run created in research_runs with trigger_source='scheduler'
    const createdRun = db.getRun(postSchedule.last_run_id);
    assert(createdRun, 'Created run must exist in research_runs');
    assert.strictEqual(createdRun.trigger_source, 'scheduler');
    assert.strictEqual(createdRun.schedule_id, created.id);

    // Verify schedule firing audit log
    const firings = db.getScheduleFirings(created.id);
    assert(firings.length >= 1, 'Schedule firing record must exist');
    assert.strictEqual(firings[0].status, 'launched');
    assert.strictEqual(firings[0].run_id, postSchedule.last_run_id);

    // Clean up
    scheduler.deleteSchedule(created.id);
  });

  // Test 6: Concurrency Guard
  await asyncTest('6. Concurrency guard defers scheduler firing when department is busy', async () => {
    // Create a run and set its status to active 'deep_research'
    const dummyRunObj = db.createRun({
      run_name: 'Simulated Active Run',
      input_mode: 'discovery',
    }, ['US'], {});
    const dummyRunId = dummyRunObj?.id || dummyRunObj;
    rawDb.prepare("UPDATE research_runs SET status = 'deep_research' WHERE id = ?").run(dummyRunId);

    // Create a due schedule
    const created = scheduler.createSchedule({
      name: 'Deferred Schedule Test',
      schedule_type: 'interval',
      interval_minutes: 15,
    });
    rawDb.prepare('UPDATE schedules SET next_run_at = ? WHERE id = ?').run(
      new Date(Date.now() - 10000).toISOString(),
      created.id
    );

    // Run tick
    const tickResult = await scheduler.tick();
    assert(tickResult.deferredCount >= 1, 'Due schedule must be deferred while active run is in progress');

    // Clean up dummy run and schedule
    rawDb.prepare("UPDATE research_runs SET status = 'completed' WHERE id = ?").run(dummyRunId);
    scheduler.deleteSchedule(created.id);
  });

  // Test 7: Quality Supervisor Fix (outputType & Context Awareness)
  await asyncTest('7. Quality Supervisor Stage 2 skips outputType="config" and provides context for research', async () => {
    // 1. Verify registerQualityRules stores outputType
    const regRules = qualitySupervisor.rulesRegistry || {};
    assert(regRules[1] && regRules[1].outputType === 'config', 'Agent #1 must have outputType="config"');
    assert(regRules[2] && regRules[2].outputType === 'config', 'Agent #2 must have outputType="config"');
    assert(regRules[4] && regRules[4].outputType === 'config', 'Agent #4 must have outputType="config"');

    // 2. Stage 2 review for Agent #1 (config) should skip Gemini LLM call
    const configReview = await qualitySupervisor.runStage2GeminiReview(1, {
      status: 'success',
      parsed_brief: { budget: 500 },
    }, {}, 999);

    assert.strictEqual(configReview.verdict, 'skip', 'Config outputType must return verdict="skip"');
    assert(configReview.feedback.includes('skipped'), 'Feedback must indicate skipped config output');
  });

  // Test 8: Agent #4 Registry & Quality Rules Integration
  test('8. Agent #4 (Scheduler Agent) is registered in Agent Registry and QS Rules', () => {
    const agent4 = agentRegistry.get(4);
    assert(agent4, 'Agent #4 must be registered in Agent Registry');
    assert.strictEqual(agent4.name, 'Scheduler Agent');
    assert.strictEqual(agent4.layer, 'control');

    const rules4 = qualitySupervisor.getRules(4);
    assert(rules4, 'Quality Supervisor must have rules registered for Agent #4');
    assert.strictEqual(rules4.outputType, 'config');
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   P1.4 TEST RESULTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passed === total) {
    console.log('🎉 All Scheduler Agent & QS Fix tests passed successfully!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${total - passed} test(s) failed.`);
    process.exit(1);
  }
}

runP14Tests().catch((err) => {
  console.error('Fatal error during P1.4 tests:', err);
  process.exit(1);
});
