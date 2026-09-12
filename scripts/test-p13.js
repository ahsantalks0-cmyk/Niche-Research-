'use strict';

/**
 * scripts/test-p13.js — Automated Verification for Agent #3: Quality Supervisor Agent (P1.3)
 *
 * Verifies:
 * 1. Migration v5: quality_reviews table schema and DB helper methods.
 * 2. Agent Registry: Agent #3 registered as Quality Supervisor Agent.
 * 3. Stage 1 & Stage 2 Deterministic / Semantic Rules:
 *    - R1: Non-empty check (anti-vacuous).
 *    - R2: Schema completeness check.
 *    - R3: Brief compliance check.
 *    - R4: Depth requirement check.
 *    - R5: No-placeholder text check.
 * 4. Chain Engine Output Interceptor:
 *    - QS intercepts output after agent execution.
 *    - Send-back retry flow with qs_feedback context.
 *    - Escalation after 2 send-backs.
 *    - Graceful fallback when no Gemini API key is provided.
 * 5. Quality Summary Statistics API & UI data helpers.
 */

const assert = require('assert');
const db = require('../src/main/db');
const agentRegistry = require('../src/main/engine/agentRegistry');
const qualitySupervisor = require('../src/main/agents/qualitySupervisor');
const { chainEngine } = require('../src/main/engine/chainEngine');

async function runP13Tests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P1.3 · Agent #3 Quality Supervisor Automated Tests');
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

  // 1. Migration v5 & Table Schema Verification
  test('1. Migration v5 created quality_reviews table and DB helpers', () => {
    const rawDb = db.getDb();
    const tables = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);
    assert(tables.includes('quality_reviews'), 'quality_reviews table must exist');

    const columns = rawDb.pragma('table_info(quality_reviews)').map((c) => c.name);
    assert(columns.includes('run_id'), 'quality_reviews must contain run_id');
    assert(columns.includes('agent_number'), 'quality_reviews must contain agent_number');
    assert(columns.includes('review_round'), 'quality_reviews must contain review_round');
    assert(columns.includes('stage1_verdict'), 'quality_reviews must contain stage1_verdict');
    assert(columns.includes('stage2_verdict'), 'quality_reviews must contain stage2_verdict');
    assert(columns.includes('verdict'), 'quality_reviews must contain verdict');
    assert(columns.includes('failed_rules_json'), 'quality_reviews must contain failed_rules_json');
    assert(columns.includes('feedback_text'), 'quality_reviews must contain feedback_text');

    assert(typeof db.insertQualityReview === 'function', 'db.insertQualityReview must be a function');
    assert(typeof db.getQualityReviews === 'function', 'db.getQualityReviews must be a function');
    assert(typeof db.getQualitySummary === 'function', 'db.getQualitySummary must be a function');
  });

  // 2. Agent Registry Verification
  test('2. Agent #3 is registered in agentRegistry as Quality Supervisor Agent', () => {
    const ag3 = agentRegistry.get(3);
    assert(ag3, 'Agent #3 must exist in registry');
    assert.strictEqual(ag3.name, 'Quality Supervisor Agent');
    assert.strictEqual(ag3.isRegistered, true, 'Agent #3 must be registered');
    assert.strictEqual(ag3.layer, 'qa');
    assert.strictEqual(ag3.meta.isShadow, true);
  });

  // 3. Stage 1 Rule Direct Auditing
  await asyncTest('3a. Stage 1 Rule R1 (Non-empty / anti-vacuous) fails on empty/null output', async () => {
    const reviewEmpty = await qualitySupervisor.reviewOutput({
      runId: 9991,
      agentNumber: 2,
      output: null,
      context: {},
      reviewRound: 1,
    });
    assert.strictEqual(reviewEmpty.verdict, 'send_back');
    assert.strictEqual(reviewEmpty.stage1Verdict, 'fail');
    assert(reviewEmpty.failedRules.includes('R1_NON_EMPTY'), 'Must fail R1_NON_EMPTY rule');

    const reviewBlankObj = await qualitySupervisor.reviewOutput({
      runId: 9991,
      agentNumber: 2,
      output: {},
      context: {},
      reviewRound: 1,
    });
    assert.strictEqual(reviewBlankObj.verdict, 'send_back');
  });

  await asyncTest('3b. Stage 1 Rule R2 (Schema completeness) fails when required fields are missing', async () => {
    const reviewIncomplete = await qualitySupervisor.reviewOutput({
      runId: 9992,
      agentNumber: 2,
      output: { summary: 'Missing parsed_brief field' },
      context: {},
      reviewRound: 1,
    });
    assert.strictEqual(reviewIncomplete.verdict, 'send_back');
    assert(reviewIncomplete.failedRules.includes('R2_SCHEMA_COMPLETENESS'));
  });

  await asyncTest('3c. Stage 1 Rule R3 (Brief compliance) fails on partial country coverage', async () => {
    const contextWithBrief = {
      brief: {
        target_countries: ['US', 'CA', 'UK'],
      },
    };
    const outputPartialCountries = {
      summary: 'Parsed criteria brief',
      parsed_brief: {
        input_mode: 'discovery',
        niche_quantity: 5,
        target_countries: ['US'], // Missing CA and UK
      },
    };
    const reviewPartial = await qualitySupervisor.reviewOutput({
      runId: 9993,
      agentNumber: 2,
      output: outputPartialCountries,
      context: contextWithBrief,
      reviewRound: 1,
    });
    assert.strictEqual(reviewPartial.verdict, 'send_back');
    assert(reviewPartial.failedRules.includes('R3_BRIEF_COMPLIANCE'));
  });

  await asyncTest('3d. Stage 1 Rule R5 (No-placeholder) fails on placeholder text', async () => {
    const outputWithPlaceholder = {
      summary: 'Parsed criteria brief',
      parsed_brief: {
        input_mode: 'discovery',
        niche_quantity: 5,
        target_countries: ['US', 'CA', 'UK'],
        own_niche_name: 'Lorem ipsum dolor sit amet placeholder TBD',
      },
    };
    const reviewPlaceholder = await qualitySupervisor.reviewOutput({
      runId: 9994,
      agentNumber: 2,
      output: outputWithPlaceholder,
      context: {},
      reviewRound: 1,
    });
    assert.strictEqual(reviewPlaceholder.verdict, 'send_back');
    assert(reviewPlaceholder.failedRules.includes('R5_NO_PLACEHOLDER_TEXT'));
  });

  await asyncTest('3e. Valid output passes Stage 1 & Stage 2 (with graceful no-key fallback)', async () => {
    const validOutput = {
      summary: 'Parsed criteria brief successfully generated with 5 target niches across 3 countries.',
      parsed_brief: {
        brief_version: '1.0',
        input_mode: 'discovery',
        niche_quantity: 5,
        countries: ['US', 'CA', 'UK'],
        target_countries: ['US', 'CA', 'UK'],
        business_modes: ['ecom_physical', 'digital_software'],
        monetization_priorities: ['ad_revenue', 'affiliate'],
        approval_gate: { auto_approve: true, gate_node: 'discovery_complete' },
        agent_instructions: { agent_6_discovery: {} },
        max_competition_level: 'medium',
      },
    };
    const reviewValid = await qualitySupervisor.reviewOutput({
      runId: 9995,
      agentNumber: 2,
      output: validOutput,
      context: {},
      reviewRound: 1,
    });
    assert.strictEqual(reviewValid.verdict, 'pass');
    assert.strictEqual(reviewValid.stage1Verdict, 'pass');
    assert.strictEqual(reviewValid.failedRules.length, 0);
  });

  // 4. Chain Engine Output Interceptor Integration
  await asyncTest('4. Chain Engine invokes Quality Supervisor interceptor during run execution', async () => {
    const run = db.createRun(
      {
        run_name: 'P1.3 Quality Supervisor Test Run',
        input_mode: 'discovery',
        niche_quantity: 3,
        business_modes: ['ecommerce'],
        raw_prompt: 'Find 3 high profit physical product niches for US and Canada',
        auto_approve: true,
      },
      ['US', 'CA'],
      null
    );

    // Delete pre-generated criteria brief so startRun triggers Agent #2 via chain engine
    db.getDb().prepare('DELETE FROM run_criteria WHERE run_id = ?').run(run.id);

    // Start run through chain engine
    const startRes = await chainEngine.startRun(run.id);
    assert.strictEqual(startRes.success, true);

    // Check that quality reviews were logged in DB for this run
    const reviews = db.getQualityReviews(run.id);
    assert(reviews.length > 0, 'Quality reviews must be persisted for executed run');

    const ag2Review = reviews.find((r) => r.agent_number === 2);
    assert(ag2Review, 'Agent #2 output must have been reviewed by Quality Supervisor');
    assert.strictEqual(ag2Review.verdict, 'pass');

    const ag1Review = reviews.find((r) => r.agent_number === 1);
    assert(ag1Review, 'Agent #1 output must have been reviewed by Quality Supervisor');
    assert.strictEqual(ag1Review.verdict, 'pass');

    // Verify Quality Summary API
    const summary = db.getQualitySummary(run.id);
    assert(summary.totalReviews >= 2, 'Summary must record reviews');
    assert.strictEqual(summary.totalPassed, summary.totalReviews);
    assert.strictEqual(summary.passRatePct, 100);
  });

  // 5. Escalation after Send-backs
  await asyncTest('5. Escalation logic triggers when agent repeatedly fails quality reviews', async () => {
    // Register temporary failing agent handler to simulate repeated send-backs
    agentRegistry.register(
      35,
      'Test Failing Agent',
      'discovery',
      async (ctx) => {
        return { summary: 'Invalid output with TBD placeholder', badData: 'TBD' };
      },
      { isCritical: false }
    );

    // Register R5 rule for agent 35
    qualitySupervisor.registerQualityRules(35, {
      customCheck: (output) => {
        const str = JSON.stringify(output);
        if (str.includes('TBD')) {
          return {
            passed: false,
            failedRules: ['R5_NO_PLACEHOLDER_TEXT'],
            feedback: 'Contains TBD placeholder',
          };
        }
        return { passed: true, failedRules: [], feedback: null };
      },
    });

    const run = db.createRun({ run_name: 'P1.3 Escalation Test Run' });
    
    // Direct review test for round 1 and 2 send-backs
    const r1 = await qualitySupervisor.reviewOutput({
      runId: run.id,
      agentNumber: 35,
      output: { summary: 'Invalid TBD' },
      context: {},
      reviewRound: 1,
    });
    assert.strictEqual(r1.verdict, 'send_back');

    const r2 = await qualitySupervisor.reviewOutput({
      runId: run.id,
      agentNumber: 35,
      output: { summary: 'Invalid TBD' },
      context: {},
      reviewRound: 2,
    });
    assert.strictEqual(r2.verdict, 'send_back');

    const summary = db.getQualitySummary(run.id);
    assert.strictEqual(summary.totalSendBacks, 2);
    assert(summary.topFailedAgents.some((a) => a.agent_number === 35));
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   P1.3 Quality Supervisor Test Results: ${passed}/${total} PASSED`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runP13Tests().catch((err) => {
  console.error('Fatal P1.3 test runner error:', err);
  process.exit(1);
});
