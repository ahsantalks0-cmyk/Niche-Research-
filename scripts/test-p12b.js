'use strict';

/**
 * scripts/test-p12b.js — Automated Verification for P1.2b FIX:
 * Runs Page, Mission Control Run Detail, and Live Telemetry IPC APIs.
 */

const assert = require('assert');
const db = require('../src/main/db');
const { buildPlan } = require('../src/main/agents/departmentHead');
const { chainEngine } = require('../src/main/engine/chainEngine');

async function runP12bTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P1.2b · Runs Page, Mission Control & Live Logs Tests');
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

  // Test 1: getRuns returns list of all runs in DB
  test('db.getRuns() returns all runs ordered newest first with criteria and country tags', () => {
    const runs = db.getRuns({ limit: 50 });
    assert(Array.isArray(runs), 'db.getRuns must return an array');
    assert(runs.length >= 1, 'Database must contain at least 1 existing run');

    const firstRun = runs[0];
    assert(firstRun.id, 'Run must have an id');
    assert(firstRun.status, 'Run must have a status');
    assert(firstRun.input_mode, 'Run must have an input_mode');
    assert(Array.isArray(firstRun.business_modes), 'business_modes must be an array');
    assert(Array.isArray(firstRun.countries), 'countries must be an array');
    console.log(`    Found ${runs.length} runs in DB. Newest run ID: #${firstRun.id} [${firstRun.status}]`);
  });

  // Test 2: getRun(id) returns full run details for Mission Control
  test('db.getRun(id) returns complete run payload with agents, criteria and plan', () => {
    const runs = db.getRuns({ limit: 1 });
    assert(runs.length > 0, 'Must have a run to inspect');
    const runId = runs[0].id;

    const run = db.getRun(runId);
    assert.strictEqual(run.id, runId, 'Returned run ID must match requested ID');
    assert(run.criteria, 'Run must include criteria object');
    assert(Array.isArray(run.agents), 'Run must include agents array');
    assert.strictEqual(run.agents.length, 35, 'Run must contain all 35 agents');
    assert(Array.isArray(run.countries), 'Run must include countries array');
  });

  // Test 3: getTimingSummary returns valid structure
  test('db.getTimingSummary(runId) returns speed instrumentation metrics', () => {
    const runs = db.getRuns({ limit: 1 });
    const runId = runs[0].id;

    const timing = db.getTimingSummary(runId);
    assert(typeof timing.totalOperations === 'number', 'totalOperations must be a number');
    assert(typeof timing.totalDurationMs === 'number', 'totalDurationMs must be a number');
    assert(typeof timing.cacheHits === 'number', 'cacheHits must be a number');
  });

  // Test 4: Approval Gate Resume
  await asyncTest('chainEngine.approveRun resumes a run from awaiting_approval', async () => {
    // Create a temporary run with auto_approve = 0
    const testRun = db.createRun(
      {
        run_name: 'P1.2b Approval Gate Test Run',
        input_mode: 'discovery',
        business_modes: ['blogging'],
        niche_quantity: 1,
        auto_approve: 0,
      },
      ['US'],
      { rawInput: 'Approval gate test' }
    );

    buildPlan(testRun.id);

    // Start run -> should pause at awaiting_approval after Phase 1
    await chainEngine.startRun(testRun.id);

    // Wait for async execution loop to reach awaiting_approval
    let midRun = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      midRun = db.getRun(testRun.id);
      if (midRun.status === 'awaiting_approval') break;
    }

    assert.strictEqual(midRun.status, 'awaiting_approval', 'Run must pause at awaiting_approval when auto_approve=0');

    // Call approveRun -> should approve and resume chain
    const res = await chainEngine.approveRun(testRun.id);
    assert.strictEqual(res.success, true, 'approveRun must return success');

    const postRun = db.getRun(testRun.id);
    assert.strictEqual(postRun.approval_gate_passed, 1, 'approval_gate_passed flag must be 1');
    assert.notStrictEqual(postRun.status, 'awaiting_approval', 'Status must transition past awaiting_approval');
  });

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`   NRD P1.2b Results: ${passed} / ${total} tests passed.`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runP12bTests().catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runP12bTests };
