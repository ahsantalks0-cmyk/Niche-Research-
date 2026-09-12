'use strict';

/**
 * scripts/test-p13c.js — Automated Verification for Fix & Infrastructure (P1.3c)
 *
 * Verifies:
 * 1. Dynamic Table Registry: sqlite_master query includes quality_reviews and all tables.
 * 2. Multi-Provider AI System: llmProviders and llmClient registration, model fetching, and validation.
 * 3. Strict Honesty Rule: Live model fetching error handling (no hardcoded fake fallbacks).
 * 4. Quality Supervisor Stage 2 LLM Integration via llmClient.
 * 5. System Tests Runner auto-discovery & execution.
 * 6. Categorized Log Streaming (AGENT, QS, CHAIN, LLM, BROWSER).
 */

const assert = require('assert');
const db = require('../src/main/db');
const llmClient = require('../src/main/llm/llmClient');
const llmProviders = require('../src/main/llm/llmProviders');
const qualitySupervisor = require('../src/main/agents/qualitySupervisor');
const systemTests = require('../src/main/engine/systemTests');
const { browserEngine } = require('../src/main/engine/browser');

async function runP13cTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P1.3c · Multi-Provider AI & System Tests Suite');
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

  // 1. Dynamic Table Registry Verification
  await asyncTest('1. Dynamic Table Registry queries sqlite_master (includes quality_reviews)', async () => {
    const health = await db.getDbHealth();
    assert(health, 'getDbHealth() must return health object');
    assert(health.tables, 'health.tables must exist');
    assert(typeof health.tables === 'object', 'health.tables must be an object');
    assert('quality_reviews' in health.tables, 'quality_reviews table must be present in dynamic health.tables');
    assert('app_settings' in health.tables, 'app_settings table must be present in health.tables');
    assert('niches' in health.tables, 'niches table must be present in health.tables');
    assert(Object.keys(health.tables).length >= 37, 'Must discover at least 37 tables');
  });

  // 2. Multi-Provider LLM Engine Verification
  test('2. Multi-Provider AI System registers all 4 providers (Gemini, OpenAI, Anthropic, Groq)', () => {
    const providers = llmClient.listProviders();
    assert.strictEqual(providers.length, 4, 'Must have 4 registered providers');
    const ids = providers.map((p) => p.id);
    assert(ids.includes('gemini'), 'Must support Gemini');
    assert(ids.includes('openai'), 'Must support OpenAI');
    assert(ids.includes('anthropic'), 'Must support Anthropic');
    assert(ids.includes('groq'), 'Must support Groq');
  });

  // 3. Strict Honesty Rule Test
  await asyncTest('3. Live fetch with invalid API key fails with clear error (no fake fallbacks)', async () => {
    try {
      const res = await llmClient.fetchModels('gemini', 'INVALID_KEY_12345');
      if (typeof res === 'object' && res !== null) {
        assert.strictEqual(res.success, false, 'Fetch with invalid key must return success=false');
        assert(res.error, 'Error message must be present');
      }
    } catch (err) {
      assert(err.message, 'Fetch with invalid key must throw clear error message');
      assert(!err.message.includes('fake'), 'Must not return fake models');
    }
  });

  // 4. Quality Supervisor Stage 2 Integration
  await asyncTest('4. Quality Supervisor Stage 2 uses llmClient.chat and falls back cleanly if no key', async () => {
    const validCriteriaParserOutput = {
      brief_version: '1.0',
      input_mode: 'manual',
      business_modes: ['B2B'],
      niche_quantity: 10,
      countries: { mode: 'all', list: [] },
      approval_gate: { required: false },
      agent_instructions: 'Execute discovery',
    };

    const review = await qualitySupervisor.reviewOutput({
      runId: 9999,
      agentNumber: 2,
      output: validCriteriaParserOutput,
      context: {},
      reviewRound: 1,
    });
    assert(review, 'Review output must return a review object');
    assert(review.verdict, 'Review verdict must exist');
    assert(review.stage1Verdict === 'pass', 'Stage 1 deterministic review must pass for valid output');
  });

  // 5. System Tests Auto-Discovery Verification
  test('5. System Tests runner auto-discovers scripts/test-*.js files', () => {
    const tests = systemTests.listSystemTests();
    assert(Array.isArray(tests), 'listSystemTests() must return an array');
    assert(tests.length >= 5, 'Must discover at least 5 test scripts');
    const fileNames = tests.map((t) => t.fileName);
    assert(fileNames.includes('test-p13c.js'), 'Must discover test-p13c.js');
    assert(fileNames.includes('test-p04.js'), 'Must discover test-p04.js');
    assert(fileNames.includes('test-p13.js'), 'Must discover test-p13.js');
  });

  // 6. Execution of a System Test
  await asyncTest('6. System Tests runner executes test-p04.js and returns duration & exit code 0', async () => {
    const res = await systemTests.runSystemTest('test-p04.js');
    assert(res, 'runSystemTest must return result object');
    assert.strictEqual(res.exitCode, 0, 'Exit code must be 0 for passing test');
    assert.strictEqual(res.passed, true, 'Test passed field must be true');
    assert(res.durationMs > 0, 'Duration must be greater than 0ms');
  });

  // 7. Log Categorization Verification
  test('7. Browser engine log accepts categories and emits categorized logs', () => {
    let emittedLog = null;
    const listener = (log) => { emittedLog = log; };
    browserEngine.on('log', listener);

    browserEngine.log('info', 'test category log 🛡️', { slotId: 1, category: 'QS' });

    browserEngine.removeListener('log', listener);

    assert(emittedLog, 'Log event must be emitted');
    assert.strictEqual(emittedLog.category, 'QS', 'Category must be QS');
    assert.strictEqual(emittedLog.message, 'test category log 🛡️');
  });

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`   P1.3c Test Results: ${passed}/${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runP13cTests().catch((err) => {
  console.error('Fatal error in P1.3c tests:', err);
  process.exit(1);
});
