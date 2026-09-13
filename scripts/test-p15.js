'use strict';

/**
 * scripts/test-p15.js — Complete Verification for Scheduler Form Fix & Jarvis Gateway Agent #5 (P1.5)
 *
 * Verifies:
 * 1. Database Schema & Migration v8 (jarvis_requests table, jarvis_enabled, jarvis_port in app_settings).
 * 2. Agent #5 Registration & Quality Supervisor rules.
 * 3. Jarvis Gateway Agent Lifecycle, 127.0.0.1 Binding & Port Configuration.
 * 4. Authentication Security (timing-safe key check, missing/invalid key rejection).
 * 5. Rate Limiting Protection (60 req/min per client IP).
 * 6. Gateway Endpoints (/v1/ping, /v1/schedules, /v1/research POST, /v1/research/:id, /v1/research/:id/results).
 * 7. Audit Logging in SQLite jarvis_requests table.
 * 8. Scheduler Form Config Round-Trip (unified business modes, country codes, input modes).
 */

const assert = require('assert');
const http = require('node:http');
const db = require('../src/main/db');
const { JarvisGatewayAgent, jarvisGateway } = require('../src/main/agents/jarvisGateway');
const { scheduler } = require('../src/main/agents/scheduler');
const agentRegistry = require('../src/main/engine/agentRegistry');
const qualitySupervisor = require('../src/main/agents/qualitySupervisor');

// Helper for making HTTP requests to local Jarvis Gateway
function makeRequest({ port, method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    let postData = null;

    if (body) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: reqHeaders,
      timeout: 3000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runP15Tests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P1.5 · Scheduler Unified Form & Jarvis Gateway Test');
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

  // Test 1: Migration v8 & Table Structure
  test('1. Migration v8 creates jarvis_requests table and adds jarvis settings columns', () => {
    const table = rawDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jarvis_requests'").get();
    assert(table, 'jarvis_requests table must exist');

    const cols = rawDb.prepare("PRAGMA table_info(jarvis_requests)").all().map(c => c.name);
    assert(cols.includes('method'), 'jarvis_requests must have method column');
    assert(cols.includes('path'), 'jarvis_requests must have path column');
    assert(cols.includes('status_code'), 'jarvis_requests must have status_code column');
    assert(cols.includes('client_ip'), 'jarvis_requests must have client_ip column');
    assert(cols.includes('duration_ms'), 'jarvis_requests must have duration_ms column');

    const appSettingsCols = rawDb.prepare("PRAGMA table_info(app_settings)").all().map(c => c.name);
    assert(appSettingsCols.includes('jarvis_enabled'), 'app_settings must have jarvis_enabled');
    assert(appSettingsCols.includes('jarvis_port'), 'app_settings must have jarvis_port');
    assert(appSettingsCols.includes('jarvis_api_key'), 'app_settings must have jarvis_api_key');
  });

  // Test 2: Agent #5 Registration & Quality Supervisor rules
  test('2. Agent #5 is registered in AgentRegistry and QualitySupervisor', () => {
    const agent = agentRegistry.get(5);
    assert(agent, 'Agent #5 must be registered in agentRegistry');
    assert.strictEqual(agent.number, 5);
    assert.strictEqual(agent.name, 'Jarvis Gateway');
    assert.strictEqual(agent.layer, 'control');
    assert.strictEqual(agent.status, 'registered');

    // Quality rules check
    const rules = qualitySupervisor.getRules(5);
    assert(rules, 'Quality Supervisor must include rules for Agent #5');
  });

  // Setup Jarvis Server on dedicated test port
  const TEST_PORT = 49152;
  const TEST_KEY = 'sk_jarvis_test_secret_key_12345';
  const gateway = new JarvisGatewayAgent({ port: TEST_PORT, apiKey: TEST_KEY });

  // Test 3: Lifecycle and Localhost Binding
  await asyncTest('3. Jarvis Gateway starts and binds strictly to 127.0.0.1', async () => {
    await gateway.start({ port: TEST_PORT, apiKey: TEST_KEY });
    const status = gateway.getStatus();
    assert.strictEqual(status.running, true);
    assert.strictEqual(status.port, TEST_PORT);
    assert.strictEqual(status.host, '127.0.0.1');
  });

  // Test 4: Authentication (Timing-safe Key Verification)
  await asyncTest('4. Unauthenticated or invalid-key requests are rejected with 401 Unauthorized', async () => {
    // Missing header
    const noKeyRes = await makeRequest({ port: TEST_PORT, method: 'GET', path: '/v1/ping' });
    assert.strictEqual(noKeyRes.statusCode, 401);
    assert.strictEqual(noKeyRes.body.error, 'MISSING_API_KEY');

    // Invalid key
    const badKeyRes = await makeRequest({
      port: TEST_PORT,
      method: 'GET',
      path: '/v1/ping',
      headers: { 'X-Jarvis-Key': 'sk_jarvis_wrong_key' },
    });
    assert.strictEqual(badKeyRes.statusCode, 401);
    assert.strictEqual(badKeyRes.body.error, 'INVALID_API_KEY');
  });

  // Test 5: /v1/ping Endpoint with Valid Key
  await asyncTest('5. GET /v1/ping returns 200 OK and health status with valid X-Jarvis-Key', async () => {
    const res = await makeRequest({
      port: TEST_PORT,
      method: 'GET',
      path: '/v1/ping',
      headers: { 'X-Jarvis-Key': TEST_KEY },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.gateway, 'online');
    assert.strictEqual(res.body.agent, 'jarvis-gateway');
    assert.strictEqual(res.body.version, '1.0.0');
    assert(typeof res.body.uptime_seconds === 'number');
  });

  // Test 6: /v1/schedules Endpoint
  await asyncTest('6. GET /v1/schedules returns list of schedules', async () => {
    const res = await makeRequest({
      port: TEST_PORT,
      method: 'GET',
      path: '/v1/schedules',
      headers: { 'X-Jarvis-Key': TEST_KEY },
    });

    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.body.schedules), 'Response must contain schedules array');
  });

  // Test 7: /v1/research POST Validation & Commission
  let commissionedRunId = null;
  await asyncTest('7. POST /v1/research validates payload and commissions new research run', async () => {
    // Missing run_name
    const invalidRes = await makeRequest({
      port: TEST_PORT,
      method: 'POST',
      path: '/v1/research',
      headers: { 'X-Jarvis-Key': TEST_KEY },
      body: { invalid: true },
    });
    assert.strictEqual(invalidRes.statusCode, 400);
    assert.strictEqual(invalidRes.body.error, 'VALIDATION_ERROR');

    // Valid Commission Payload
    const validPayload = {
      run_name: 'Jarvis Gateway Integration Run',
      input_mode: 'discovery',
      business_modes: ['blogging', 'affiliate', 'ecommerce', 'digital_products'],
      niche_quantity: 2,
      country_codes: ['US', 'GB'],
      auto_approve: true,
    };

    const validRes = await makeRequest({
      port: TEST_PORT,
      method: 'POST',
      path: '/v1/research',
      headers: { 'X-Jarvis-Key': TEST_KEY },
      body: validPayload,
    });

    assert.strictEqual(validRes.statusCode, 201);
    assert.strictEqual(validRes.body.success, true);
    assert(validRes.body.run_id, 'Must return run_id');
    assert.strictEqual(validRes.body.status, 'planning');
    commissionedRunId = validRes.body.run_id;
  });

  // Test 8: /v1/research/:id Query
  await asyncTest('8. GET /v1/research/:id queries status of commissioned run', async () => {
    assert(commissionedRunId, 'Run ID must be set');
    const res = await makeRequest({
      port: TEST_PORT,
      method: 'GET',
      path: `/v1/research/${commissionedRunId}`,
      headers: { 'X-Jarvis-Key': TEST_KEY },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.run.id, commissionedRunId);
    assert.strictEqual(res.body.run.run_name || res.body.run.name, 'Jarvis Gateway Integration Run');
  });

  // Test 9: /v1/research/:id/results Query
  await asyncTest('9. GET /v1/research/:id/results returns structured results and niches', async () => {
    assert(commissionedRunId, 'Run ID must be set');
    const res = await makeRequest({
      port: TEST_PORT,
      method: 'GET',
      path: `/v1/research/${commissionedRunId}/results`,
      headers: { 'X-Jarvis-Key': TEST_KEY },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.run_id, commissionedRunId);
    assert(Array.isArray(res.body.niches), 'Must return niches array');
  });

  // Test 10: Audit Logging to SQLite
  await asyncTest('10. Incoming Gateway requests are audited in SQLite jarvis_requests table', async () => {
    const logs = db.getJarvisRequests(10);
    assert(Array.isArray(logs), 'getJarvisRequests must return array');
    assert(logs.length >= 4, 'Must have at least 4 audited requests');

    const pingLog = logs.find(l => l.path === '/v1/ping');
    assert(pingLog, 'Must have logged /v1/ping request');
    assert.strictEqual(pingLog.status_code, 200);
    assert.strictEqual(pingLog.method, 'GET');
  });

  // Test 11: Rate Limiting
  await asyncTest('11. Rate limiter tracks requests per client IP', async () => {
    // Gateway allows 60 req/min. We verify limiter map is populated.
    assert(gateway.rateLimiter.size > 0, 'Rate limiter map must have tracked 127.0.0.1');
    const entry = gateway.rateLimiter.get('127.0.0.1');
    assert(entry && entry.count >= 5, 'Rate limiter count must reflect requests made');
  });

  // Stop test gateway server
  await gateway.stop();

  // Test 12: Scheduler Agent Form Round-Trip (Unified Run-Config)
  await asyncTest('12. Scheduler run-config round-trip retains unified 4 business modes & country codes', async () => {
    const fullConfig = {
      name: 'Unified Scheduler Automation Radar',
      schedule_type: 'daily',
      time_of_day: '08:30',
      run_config: {
        run_name: 'Daily Radar (Auto)',
        input_mode: 'own_niche',
        niche_name: 'Mechanical Keyboards & Ergonomic Accessories',
        business_modes: ['blogging', 'affiliate', 'ecommerce', 'digital_products'],
        niche_quantity: 3,
        country_codes: ['US', 'GB', 'DE', 'CA'],
        auto_approve: true,
      },
    };

    // Create via Scheduler API
    const newSched = scheduler.createSchedule(fullConfig);
    const newId = typeof newSched === 'object' ? newSched.id : newSched;
    assert(newId, 'Schedule must be created with ID');

    // Read back and verify exact persistence
    const saved = db.getSchedule(newId);
    assert.strictEqual(saved.name, 'Unified Scheduler Automation Radar');
    assert.strictEqual(saved.schedule_type, 'daily');
    assert.strictEqual(saved.time_of_day, '08:30');
    assert.deepStrictEqual(saved.run_config.business_modes, ['blogging', 'affiliate', 'ecommerce', 'digital_products']);
    assert.deepStrictEqual(saved.run_config.country_codes, ['US', 'GB', 'DE', 'CA']);
    assert.strictEqual(saved.run_config.input_mode, 'own_niche');
    assert.strictEqual(saved.run_config.niche_name, 'Mechanical Keyboards & Ergonomic Accessories');
    assert.strictEqual(saved.run_config.auto_approve, true);

    // Update schedule
    scheduler.updateSchedule(newId, {
      enabled: 0,
      run_config: {
        ...saved.run_config,
        input_mode: 'own_domain',
        domain: 'mechkeys.store',
        business_modes: ['ecommerce', 'digital_products'],
      },
    });

    const updated = db.getSchedule(newId);
    assert.strictEqual(updated.enabled, false);
    assert.strictEqual(updated.run_config.input_mode, 'own_domain');
    assert.strictEqual(updated.run_config.domain, 'mechkeys.store');
    assert.deepStrictEqual(updated.run_config.business_modes, ['ecommerce', 'digital_products']);

    // Clean up
    scheduler.deleteSchedule(newId);
    assert.strictEqual(db.getSchedule(newId), null);
  });

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`   P1.5 TEST SUMMARY: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  if (passed !== total) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runP15Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
