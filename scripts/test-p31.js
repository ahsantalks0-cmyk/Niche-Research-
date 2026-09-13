'use strict';

/**
 * NRD · scripts/test-p31.js — Test suite for Prompt P3.1 (3 Fixes + Agent #6 Niche Discovery)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 RUNNING SYSTEM VERIFICATION SUITE — P3.1');
console.log('═══════════════════════════════════════════════════════════\n');

async function runTests() {
  let passedCount = 0;
  let totalCount = 0;

  function check(label, fn) {
    totalCount++;
    try {
      fn();
      console.log(`  ✓ PASSED: ${label}`);
      passedCount++;
    } catch (err) {
      console.error(`  ✕ FAILED: ${label}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  async function checkAsync(label, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`  ✓ PASSED: ${label}`);
      passedCount++;
    } catch (err) {
      console.error(`  ✕ FAILED: ${label}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  /* 1. Database & Migrations */
  console.log('1️⃣  Database & Schema Verification (v10 Migration)');
  const db = require('../src/main/db');
  db.getDb(); // Init DB

  check('Database v10 columns present in niches table', () => {
    const columns = db.getDb().prepare("PRAGMA table_info(niches)").all();
    const colNames = columns.map(c => c.name);
    assert.ok(colNames.includes('source'), 'niches table missing source column');
    assert.ok(colNames.includes('signal_evidence'), 'niches table missing signal_evidence column');
    assert.ok(colNames.includes('countries'), 'niches table missing countries column');
  });

  check('db.getSettings() includes jarvis_enabled and jarvis_port', () => {
    const settings = db.getSettings();
    assert.ok('jarvis_enabled' in settings, 'settings missing jarvis_enabled');
    assert.ok('jarvis_port' in settings, 'settings missing jarvis_port');
  });

  /* 2. UI Fixes Verification */
  console.log('\n2️⃣  UI Fixes Verification');

  check('SOON badge removed from index.html', () => {
    const html = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
    assert.strictEqual(html.includes('<span class="nav-badge">SOON</span>'), false, 'SOON badge still found in index.html');
  });

  /* 3. Senior Consultant Honesty & Action Protocol */
  console.log('\n3️⃣  Senior Consultant Agent Verification');
  const { consultantAgent } = require('../src/main/agents/consultant');

  check('Consultant system prompt includes strict honesty & zero-fabrication rules', () => {
    const fileContent = fs.readFileSync(path.join(__dirname, '../src/main/agents/consultant.js'), 'utf8');
    assert.ok(fileContent.includes('NEVER INVENT NICHES'), 'Missing honesty rule: NEVER INVENT NICHES');
    assert.ok(fileContent.includes('NEVER CLAIM AN ACTION WAS PERFORMED WITHOUT EXECUTION'), 'Missing honesty rule: NEVER CLAIM AN ACTION');
  });

  check('Consultant detectActionProposal parses niche extraction query', () => {
    const query = "3 blogging niches US ke liye nikalo";
    const proposal = consultantAgent.detectActionProposal(query, 1);
    assert.ok(proposal, 'Failed to detect action proposal for query');
    assert.strictEqual(proposal.action, 'start_run');
    assert.strictEqual(proposal.payload.niche_quantity, 3);
    assert.ok(proposal.payload.business_modes.includes('blogging'));
    assert.ok(proposal.payload.country_codes.includes('US'));
  });

  await checkAsync('Consultant executeAction creates run and appends confirmation message', async () => {
    const chat = db.createConsultantChat('Test Action Chat');
    const proposal = {
      type: 'action_proposal',
      action: 'start_run',
      title: 'Launch Test Run',
      payload: {
        run_name: 'P3.1 Test Run',
        input_mode: 'discovery',
        business_modes: ['blogging'],
        niche_quantity: 3,
        country_codes: ['US'],
        chat_id: chat.id,
      },
    };

    const res = await consultantAgent.executeAction(proposal);
    assert.ok(res.success, 'executeAction failed');
    assert.ok(res.runId > 0, 'Invalid runId returned');

    const msgs = db.getConsultantMessages(chat.id);
    assert.ok(msgs.length > 0, 'No confirmation message added to chat');
    const lastMsg = msgs[msgs.length - 1];
    assert.ok(lastMsg.content.includes(`Run #${res.runId}`), 'Confirmation message missing Run ID');

    // Wait 500ms for background chain engine to finish processing the consultant run
    await new Promise((r) => setTimeout(r, 500));
  });

  /* 4. Agent #6 Niche Discovery Agent */
  console.log('\n4️⃣  Agent #6 (Niche Discovery Agent) Verification');
  const agentRegistry = require('../src/main/engine/agentRegistry');
  const { nicheDiscoveryAgent } = require('../src/main/agents/nicheDiscovery');

  check('Agent #6 registered in Agent Registry', () => {
    const node = agentRegistry.get(6);
    assert.ok(node, 'Agent #6 not found in registry');
    assert.strictEqual(node.name, 'Niche Discovery');
    assert.strictEqual(node.layer, 'discovery');
  });

  await checkAsync('Agent #6 execution — Mode A (own_niche)', async () => {
    const run = db.createRun({
      run_name: 'Own Niche Test Run',
      input_mode: 'own_niche',
      business_modes: ['blogging'],
      niche_quantity: 1,
    }, ['US']);

    db.insert('run_criteria', {
      run_id: run.id,
      raw_input: 'Test Raw Input',
      parsed_brief: JSON.stringify({
        input_mode: 'own_niche',
        own_niche: 'Ergonomic Desk Accessories',
        business_modes: ['blogging'],
        niche_quantity: 1,
      }),
    });

    const output = await nicheDiscoveryAgent.run({ runId: run.id });
    assert.ok(output.candidates_count >= 1, 'No candidates generated for own_niche');
    assert.strictEqual(output.candidates[0].niche_name, 'Ergonomic Desk Accessories');
    assert.strictEqual(output.candidates[0].source, 'user_provided');

    const dbNiches = db.findBy('niches', { run_id: run.id });
    assert.strictEqual(dbNiches.length, 1);
    assert.strictEqual(dbNiches[0].source, 'user_provided');
  });

  await checkAsync('Agent #6 execution — Mode C (discovery with web signals)', async () => {
    const run = db.createRun({
      run_name: 'Discovery Mode Test Run',
      input_mode: 'discovery',
      business_modes: ['blogging', 'ecommerce'],
      niche_quantity: 3,
    }, ['US']);

    db.insert('run_criteria', {
      run_id: run.id,
      raw_input: 'Test Discovery Input',
      parsed_brief: JSON.stringify({
        input_mode: 'discovery',
        business_modes: ['blogging', 'ecommerce'],
        niche_quantity: 3,
        countries: { list: ['US'] },
      }),
    });

    const output = await nicheDiscoveryAgent.run({ runId: run.id });
    assert.ok(output.candidates_count >= 3, `Expected at least 3 candidates, got ${output.candidates_count}`);

    const dbNiches = db.findBy('niches', { run_id: run.id });
    assert.ok(dbNiches.length >= 3, 'Candidates not properly saved to SQLite DB');

    for (const n of dbNiches) {
      assert.ok(n.niche_name.length > 3, 'Niche name too short');
      assert.ok(n.source, 'Niche source missing');
      assert.ok(n.signal_evidence, 'Niche signal_evidence missing');
    }
  });

  check('Quality Supervisor validates Agent #6 output', () => {
    const { runStage1Checks } = require('../src/main/agents/qualitySupervisor');

    const validOutput = {
      candidates_count: 2,
      candidates: [
        { niche_name: 'Raw Dog Food For Senior Dogs', signal_evidence: 'Google Autocomplete signal' },
        { niche_name: 'Notion Templates For Freelancers', signal_evidence: 'AI expansion trend' },
      ],
    };

    const evalResult = runStage1Checks(6, validOutput);
    assert.strictEqual(evalResult.passed, true, `Quality Supervisor rejected valid Agent #6 output: ${evalResult.feedback}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
  console.log('═══════════════════════════════════════════════════════════');

  if (passedCount !== totalCount) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
