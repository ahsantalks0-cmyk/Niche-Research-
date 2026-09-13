'use strict';

/**
 * scripts/test-p21.js — Complete Verification for P2.1 (Bug Fixes, API Key Secrets, Jarvis, Scheduler & Senior Consultant Chat Agent)
 */

const assert = require('assert');
const http = require('node:http');
const db = require('../src/main/db');
const { jarvisGateway } = require('../src/main/agents/jarvisGateway');
const { scheduler } = require('../src/main/agents/scheduler');
const { consultantAgent } = require('../src/main/agents/consultant');
const agentRegistry = require('../src/main/engine/agentRegistry');

function makeHttpRequest({ port, method, path, headers = {} }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers,
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
    req.end();
  });
}

async function runP21Tests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   NRD P2.1 · Bug Fixes, Secrets & Senior Consultant Test');
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

  // TEST 1: Database Migration v9 & Settings API Key Persistence
  test('1. API Key Persistence in app_settings (OpenAI, Anthropic, Groq, Gemini)', () => {
    const testPatch = {
      geminiApiKey: 'test_gemini_key_123',
      openaiApiKey: 'sk-test-openai-key-456',
      anthropicApiKey: 'sk-ant-test-key-789',
      groqApiKey: 'gsk_test_groq_key_999',
    };

    db.saveSettings(testPatch);
    const settings = db.getSettings();

    assert.strictEqual(settings.gemini_api_key, 'test_gemini_key_123', 'geminiApiKey saved');
    assert.strictEqual(settings.openai_api_key, 'sk-test-openai-key-456', 'openaiApiKey saved');
    assert.strictEqual(settings.anthropic_api_key, 'sk-ant-test-key-789', 'anthropicApiKey saved');
    assert.strictEqual(settings.groq_api_key, 'gsk_test_groq_key_999', 'groqApiKey saved');
  });

  // TEST 2: Scheduler Agent Operations (Create, Update, Tick, Delete)
  await asyncTest('2. Scheduler Agent Operations (Create, Edit, Auto-Tick, Delete)', async () => {
    // Create schedule
    const newSched = scheduler.createSchedule({
      name: 'P21 Test Automation Schedule',
      schedule_type: 'interval',
      interval_minutes: 15,
      run_config: {
        run_name: 'P21 Test Run',
        input_mode: 'discovery',
        business_modes: ['blogging', 'affiliate'],
        niche_quantity: 2,
        country_codes: ['US', 'UK'],
        auto_approve: true,
      },
    });

    assert.ok(newSched.id, 'Schedule created with ID');
    assert.strictEqual(newSched.name, 'P21 Test Automation Schedule');

    // Update schedule
    const updatedSched = scheduler.updateSchedule(newSched.id, {
      name: 'P21 Updated Schedule Name',
      interval_minutes: 30,
    });
    assert.strictEqual(updatedSched.name, 'P21 Updated Schedule Name');
    assert.strictEqual(updatedSched.interval_minutes, 30);

    // Tick scheduler
    const tickResult = await scheduler.tick();
    assert.ok(typeof tickResult.firedCount === 'number', 'Tick returns fired count');

    // Delete schedule
    const deleteRes = scheduler.deleteSchedule(newSched.id);
    assert.strictEqual(deleteRes, true, 'Schedule deleted');
  });

  // TEST 3: Jarvis Gateway Lifecycle & /v1/ping Endpoint
  await asyncTest('3. Jarvis Gateway Lifecycle & Local Loopback Auth (/v1/ping)', async () => {
    const testPort = 47822;
    const testKey = 'sk_jarvis_test_key_p21';

    db.saveSettings({
      jarvis_enabled: 1,
      jarvis_port: testPort,
      jarvis_api_key: testKey,
    });

    const startRes = await jarvisGateway.start(testPort);
    assert.strictEqual(startRes.success, true, 'Jarvis Gateway started successfully');

    // Test ping with key
    const pingRes = await makeHttpRequest({
      port: testPort,
      method: 'GET',
      path: '/v1/ping',
      headers: { 'X-Jarvis-Key': testKey },
    });

    assert.strictEqual(pingRes.statusCode, 200, '/v1/ping returned 200 OK');
    assert.strictEqual(pingRes.body.gateway, 'online', 'Gateway response indicates online');

    // Stop gateway
    await jarvisGateway.stop();
  });

  // TEST 4: Senior Consultant Chat Agent Creation & Messaging
  await asyncTest('4. Senior Consultant Chat Agent Creation, Grounding & Action Proposals', async () => {
    // 1. Create consultant chat thread
    const chat = db.createConsultantChat('P21 Strategy Test Thread');
    assert.ok(chat.id, 'Consultant chat created');

    // 2. Send message requesting top niches
    const sendRes = await consultantAgent.sendMessage(chat.id, 'Show me my top 5 niches and active runs');
    assert.ok(sendRes.userMessage, 'User message persisted');
    assert.ok(sendRes.assistantMessage, 'Assistant message generated');
    assert.ok(sendRes.messages.length >= 2, 'Message history contains user and assistant entries');

    // 3. Send message triggering action proposal
    const actionRes = await consultantAgent.sendMessage(chat.id, 'Start run for niche discovery in US market');
    assert.ok(actionRes.assistantMessage.content, 'Assistant response content present');
    assert.ok(actionRes.assistantMessage.tool_calls, 'Action proposal present in tool_calls');

    // 4. Test Action Execution (DH Action)
    const tools = typeof actionRes.assistantMessage.tool_calls === 'string'
      ? JSON.parse(actionRes.assistantMessage.tool_calls)
      : actionRes.assistantMessage.tool_calls;
    
    assert.ok(Array.isArray(tools) && tools.length > 0, 'Tool proposals array exists');
    const proposal = tools[0];

    const execRes = await consultantAgent.executeAction(proposal);
    assert.strictEqual(execRes.success, true, 'Confirmed action executed successfully');
    assert.ok(execRes.runId, 'New research run created via consultant action proposal');

    // Clean up test chat
    db.deleteConsultantChat(chat.id);
  });

  // TEST 5: Agent Registry Verification
  test('5. Agent Registry Verification (#35 Senior Consultant)', () => {
    const registered35 = agentRegistry.get(35);
    assert.ok(registered35, 'Agent #35 registered');
    assert.strictEqual(registered35.name, 'Senior Consultant');
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runP21Tests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
