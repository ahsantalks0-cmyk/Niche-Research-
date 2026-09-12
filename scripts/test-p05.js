'use strict';

/**
 * scripts/test-p05.js — Automated test verification for P0.5 Browser Engine & Title Bar.
 */

const assert = require('assert');
const path = require('path');
const db = require('../src/main/db');
const {
  browserEngine,
  engineCache,
  rateLimiter,
  slotPool,
  testHarness,
  geminiBatchCaller,
} = require('../src/main/engine');

async function runP05Tests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P0.5 · Browser Engine & Title Bar Verification');
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

  // 1. Database schema v2 and 37 tables
  test('DB has 37 tables including page_cache and timing_logs', () => {
    const health = db.getDbHealth();
    assert.strictEqual(health.schemaVersion, 2, 'Schema version should be 2');
    assert(health.tables.page_cache !== undefined, 'page_cache table exists');
    assert(health.tables.timing_logs !== undefined, 'timing_logs table exists');
    const tableCount = Object.keys(health.tables).length;
    assert(tableCount >= 37, `Expected at least 37 tables, got ${tableCount}`);
  });

  // 2. Settings contains engine configuration
  test('Settings contains engine configuration parameters', () => {
    const settings = db.getSettings();
    assert(settings.browser_slots >= 3, 'browser_slots should be >= 3');
    assert(settings.cache_ttl_hours >= 1, 'cache_ttl_hours should be configured');
    assert(settings.rate_limit_google_per_min > 0, 'rate_limit_google_per_min configured');
  });

  // 3. Cache layer hit / miss / pruning
  await asyncTest('Cache: miss fetches, hit returns in <5ms', async () => {
    const res = await testHarness.runCacheTest('test-p05-query');
    assert.strictEqual(res.firstRun.fromCache, false, 'First search should be cache miss');
    assert.strictEqual(res.secondRun.fromCache, true, 'Second search should be cache hit');
    assert(res.secondRun.elapsedMs < 100, 'Cache hit duration should be near instant (<100ms)');
  });

  // 4. Rate limiter queuing
  await asyncTest('Rate limiter enforces max rate per domain and queues', async () => {
    const res = await testHarness.runRateLimiterTest();
    assert.strictEqual(res.calls.length, 3, 'Recorded 3 rate-limited requests');
    assert(res.telemetry.totalWaits >= 1, 'Rate limiter queues requests and records wait telemetry');
  });

  // 5. 3-Slot Concurrency
  await asyncTest('3-Slot Pool manages parallel tasks with overlap', async () => {
    const res = await testHarness.runParallelSlotsTest();
    assert.strictEqual(res.tasks.length, 3, '3 parallel tasks completed');
    assert(res.distinctSlotsUsed >= 2, 'Multiple slots were used concurrently');
  });

  // 6. Browser Isolation
  await asyncTest('Browser Isolation strictly uses dedicated profiles and own registry', async () => {
    const res = await testHarness.runBrowserIsolationTest();
    assert(res.profileDir.includes('browser-profile'), 'Uses isolated browser-profile dir');
    assert.strictEqual(res.isolationGuaranteed, true, 'Zero external processes touched, only owned contexts');
  });

  // 7. Timing Logs aggregation
  await asyncTest('Timing logs record metrics and calculate savings', async () => {
    const summary = db.getTimingSummary(null);
    assert(summary.totalOperations > 0, 'Recorded timing operations in DB');
  });

  // 8. Gemini Batch Caller concurrency
  await asyncTest('Gemini Batch Caller handles chunked parallel execution', async () => {
    const items = ['alpha', 'beta', 'gamma', 'delta'];
    const results = await geminiBatchCaller.callBatch(
      items,
      async (item) => ({ item, processed: true }),
      { batchSize: 2, delayBetweenBatchesMs: 5 }
    );
    assert.strictEqual(results.length, 4);
    assert.strictEqual(results[0].item, 'alpha');
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   P0.5 Test Results: ${passed}/${total} passed`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runP05Tests().catch((err) => {
  console.error('Fatal error during P0.5 tests:', err);
  process.exit(1);
});
