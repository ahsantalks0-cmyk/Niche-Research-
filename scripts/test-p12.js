'use strict';

/**
 * scripts/test-p12.js — Automated Verification for Agent #1: Department Head Agent (P1.2)
 *
 * Verifies:
 * 1. Migration v4: chain_state column in research_runs and Agent #1 naming.
 * 2. Agent Registry: 35 agents with correct numbers, names, layers, and status flags.
 * 3. Department Head plan builder (buildPlan):
 *    - Mode A (Discovery): excludes Agent #10 if countries are pre-selected.
 *    - Mode A (Discovery): includes Agent #10 if countries are auto-potential (empty).
 *    - Plan persisted to research_runs.dh_execution_plan JSON column.
 * 4. Chain Engine execution:
 *    - Sequential execution of registered agents (Agents #1 & #2).
 *    - Graceful skipping of pending (unregistered) agents without breaking the chain.
 * 5. Approval Gate logic:
 *    - If auto_approve is false, halts with status 'awaiting_approval' after discovery phase.
 *    - approveRun resumes execution into deep research.
 * 6. Pause, Resume, and Cancel operations:
 *    - Pause stops the loop gracefully.
 *    - Cancel transitions run to 'cancelled'.
 * 7. Interrupted run recovery:
 *    - Crash/restart recovery resets stale running runs to planning/paused.
 */

const assert = require('assert');
const db = require('../src/main/db');
const agentRegistry = require('../src/main/engine/agentRegistry');
const { buildPlan } = require('../src/main/agents/departmentHead');
const { chainEngine } = require('../src/main/engine/chainEngine');

async function runP12Tests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P1.2 · Agent #1 Department Head & Chain Engine Tests');
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

  // 1. Database & Migration v4 Verification
  test('Database is initialized and migration v4 added chain_state column', () => {
    const rawDb = db.getDb();
    const columns = rawDb.pragma('table_info(research_runs)').map((c) => c.name);
    assert(columns.includes('chain_state'), 'research_runs must contain chain_state column');
    assert(columns.includes('dh_execution_plan'), 'research_runs must contain dh_execution_plan column');

    const ag1Meta = rawDb.prepare('SELECT * FROM agent_status WHERE agent_number = 1 LIMIT 1').get();
    if (ag1Meta) {
      assert.strictEqual(ag1Meta.agent_name, 'Department Head Agent');
    }
  });

  // 2. Agent Registry Verification
  test('Agent Registry holds all 35 agents with correct layer structure', () => {
    const allAgents = agentRegistry.listAll();
    assert.strictEqual(allAgents.length, 35, 'Agent registry must have 35 agents');

    const ag1 = agentRegistry.get(1);
    assert(ag1, 'Agent #1 must exist');
    assert.strictEqual(ag1.name, 'Department Head Agent');
    assert.strictEqual(ag1.isRegistered, true, 'Agent #1 must be registered');

    const ag2 = agentRegistry.get(2);
    assert(ag2, 'Agent #2 must exist');
    assert.strictEqual(ag2.name, 'Criteria Parser Agent');
    assert.strictEqual(ag2.isRegistered, true, 'Agent #2 must be registered');

    const ag10 = agentRegistry.get(10);
    assert(ag10, 'Agent #10 must exist');
    assert.strictEqual(ag10.name, 'Country Potential Intelligence');
    assert.strictEqual(ag10.isRegistered, false, 'Agent #10 should currently be pending');

    const registered = agentRegistry.listRegistered();
    assert(registered.length >= 2, 'At least Agent #1 and #2 registered');
  });

  // 3. Department Head Plan Builder — Mode A with Selected Countries (Excludes Agent #10)
  test('Department Head excludes Agent #10 when countries are pre-selected', () => {
    const run = db.createRun(
      {
        run_name: 'P12 Test Run - Preselected Countries',
        input_mode: 'discovery',
        niche_quantity: 5,
        auto_approve: 1,
      },
      ['US', 'UK', 'DE'],
      { business_modes: ['affiliate'], budget: 5000 }
    );

    const plan = buildPlan(run.id);
    assert(plan, 'Plan must be created');
    assert.strictEqual(plan.input_mode, 'discovery');
    assert.strictEqual(plan.plan_summary.agent_10_status, 'excluded');

    // Discovery phase should NOT contain agent #10
    const discoveryPhase = plan.phases.find((p) => p.phase === 'discovery');
    assert(discoveryPhase, 'Discovery phase must exist');
    const hasAg10 = discoveryPhase.agents.some((ag) => ag.number === 10);
    assert.strictEqual(hasAg10, false, 'Agent #10 must be excluded in phase when countries are selected');

    // Verify persisted in DB
    const fetched = db.getRun(run.id);
    assert(fetched.dh_execution_plan, 'dh_execution_plan must be stored in database');
    assert.strictEqual(fetched.dh_execution_plan.plan_summary.agent_10_status, 'excluded');
  });

  // 4. Department Head Plan Builder — Mode A with Auto-Potential (Includes Agent #10)
  test('Department Head includes Agent #10 when countries list is empty (auto-potential)', () => {
    const run = db.createRun(
      {
        run_name: 'P12 Test Run - Auto Potential',
        input_mode: 'discovery',
        niche_quantity: 10,
        auto_approve: 0,
      },
      [], // Empty countries => Auto-Potential
      { business_modes: ['ecommerce', 'digital_products'] }
    );

    const plan = buildPlan(run.id);
    assert(plan, 'Plan must be created');
    assert.strictEqual(plan.plan_summary.agent_10_status, 'included');

    const discoveryPhase = plan.phases.find((p) => p.phase === 'discovery');
    assert(discoveryPhase, 'Discovery phase must exist');
    const hasAg10 = discoveryPhase.agents.some((ag) => ag.number === 10);
    assert.strictEqual(hasAg10, true, 'Agent #10 must be included when countries list is empty');
  });

  // 5. Chain Engine Execution — Sequential execution with pending agent skipping
  await asyncTest('Chain Engine executes registered agents and skips pending agents', async () => {
    const run = db.createRun(
      {
        run_name: 'P12 Chain Execution Run',
        input_mode: 'discovery',
        niche_quantity: 3,
        auto_approve: 1,
      },
      ['US'],
      { business_modes: ['affiliate'] }
    );

    // Start chain synchronously
    const result = await chainEngine.startRun(run.id, { sync: true });
    assert(result.success, 'Chain run must succeed');
    assert.strictEqual(result.status, 'completed');

    // Check DB agent status for run
    const fetched = db.getRun(run.id);
    assert.strictEqual(fetched.status, 'completed');

    // Agent #1 & #2 should be done
    const ag1 = fetched.agents.find((a) => a.agent_number === 1);
    const ag2 = fetched.agents.find((a) => a.agent_number === 2);
    assert(ag1 && ag1.status === 'done', 'Agent #1 status must be done');
    assert(ag2 && ag2.status === 'done', 'Agent #2 status must be done');

    // Agent #6 (pending) should have skip output summary
    const ag6 = fetched.agents.find((a) => a.agent_number === 6);
    assert(ag6, 'Agent #6 status row must exist');
    assert(ag6.output_summary.includes('Pending implementation'), 'Agent #6 output summary indicates pending implementation');
  });

  // 6. Chain Engine — Approval Gate Pause & Resume
  await asyncTest('Chain Engine halts at Approval Gate when auto_approve is 0, and resumes on approval', async () => {
    const run = db.createRun(
      {
        run_name: 'P12 Approval Gate Test Run',
        input_mode: 'discovery',
        niche_quantity: 5,
        auto_approve: 0, // Disabled -> Approval gate required
      },
      ['US', 'UK'],
      { business_modes: ['ecommerce'] }
    );

    // 1st Execution phase (Discovery -> awaiting_approval)
    const runRes = await chainEngine.startRun(run.id, { sync: true });
    assert(runRes.success, 'First stage execution should succeed');
    assert.strictEqual(runRes.status, 'awaiting_approval', 'Run must pause at awaiting_approval');

    let currentRun = db.getRun(run.id);
    assert.strictEqual(currentRun.status, 'awaiting_approval');
    assert(currentRun.chain_state, 'chain_state must be persisted');
    assert.strictEqual(currentRun.chain_state.waitingForApproval, true);

    // Approve the run and complete subsequent phases
    const approveRes = await chainEngine.approveRun(run.id, [], { sync: true });
    assert(approveRes.success, 'Approval must succeed');
    assert.strictEqual(approveRes.status, 'completed', 'Run should complete subsequent phases');

    currentRun = db.getRun(run.id);
    assert.strictEqual(currentRun.status, 'completed');
    assert.strictEqual(currentRun.approval_gate_passed, 1);
  });

  // 7. Pause and Cancel operations
  await asyncTest('Chain Engine handles pause and cancel operations', async () => {
    const run = db.createRun(
      {
        run_name: 'P12 Pause Cancel Test',
        input_mode: 'own_niche',
        own_niche_name: 'Ergonomic Desk Accessories',
        auto_approve: 1,
      },
      ['US'],
      {}
    );

    // Pause
    const pauseRes = await chainEngine.pauseRun(run.id);
    assert(pauseRes.success, 'Pause operation should succeed');
    let r = db.getRun(run.id);
    assert.strictEqual(r.status, 'planning');

    // Cancel
    const cancelRes = await chainEngine.cancelRun(run.id);
    assert(cancelRes.success, 'Cancel operation should succeed');
    r = db.getRun(run.id);
    assert.strictEqual(r.status, 'cancelled');
  });

  // 8. Startup Recovery
  await asyncTest('Chain Engine recovers interrupted runs on startup', async () => {
    // Simulate a crashed run that was left in 'discovery' state
    const run = db.createRun(
      {
        run_name: 'P12 Crashed Run Simulation',
        input_mode: 'discovery',
        niche_quantity: 5,
        auto_approve: 1,
      },
      ['US'],
      {}
    );

    const rawDb = db.getDb();
    rawDb.prepare("UPDATE research_runs SET status = 'discovery' WHERE id = ?").run(run.id);

    // Run recovery
    const recovered = await chainEngine.recoverRunsOnStartup();
    assert(recovered.length >= 1, 'Should recover at least 1 run');
    const thisRunRecovery = recovered.find((rec) => rec.runId === run.id);
    assert(thisRunRecovery, 'Crashed run should be in recovered list');

    const updatedRun = db.getRun(run.id);
    assert.strictEqual(updatedRun.status, 'planning', 'Interrupted run status must be reset to planning');
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   P1.2 Tests Complete: ${passed} / ${total} passed`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runP12Tests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runP12Tests };
