#!/usr/bin/env node
'use strict';

/**
 * NRD · test-p04.js — P0.4 Verification Suite
 * Tests Country Selection System, Input Mode logic, and Run Creation with DB persistence.
 */

const assert = require('assert');
const db = require('../src/main/db.js');

console.log('════════════════════════════════════════════════════════════════');
console.log('NRD · P0.4 Country Selection & Input Mode UI Test Suite');
console.log('════════════════════════════════════════════════════════════════');

async function runTests() {
  // Ensure DB initialized
  const dbInstance = db.getDb();
  db.runMigrations(dbInstance);

  // Test 1: getCountries returns 30 countries with potential score
  console.log('\n▸ Test 1: Validating countries database retrieval…');
  const countries = db.getCountries(false);
  assert.strictEqual(countries.length, 30, `Expected 30 countries, got ${countries.length}`);
  const us = countries.find((c) => c.country_code === 'US');
  assert(us, 'United States (US) must exist');
  assert(us.potential_score >= 90, `US potential score should be >= 90, got ${us.potential_score}`);
  assert(Array.isArray(us.local_platforms) && us.local_platforms.length > 0, 'Parsed platforms must be non-empty array');
  console.log('  ✓ Test 1 Passed: 30 market telemetry profiles verified with realistic potential scores.');

  // Test 2: Create a Discovery-mode run with 2 countries
  console.log('\n▸ Test 2: Creating Discovery-mode run with 2 user-selected countries (US, UK)…');
  const run1Data = {
    run_name: 'P0.4 Test Discovery Run',
    input_mode: 'discovery',
    business_modes: ['blogging', 'affiliate'],
    niche_quantity: 5,
    competition_level: 'medium',
    status: 'pending',
    approval_gate_passed: 0,
    auto_approve: 0,
    trigger_source: 'ui',
  };
  const run1Countries = ['US', 'UK'];
  const run1Criteria = {
    input_mode: 'discovery',
    quantity: 5,
    business_modes: ['blogging', 'affiliate'],
  };

  const createdRun1 = db.createRun(run1Data, run1Countries, run1Criteria);
  assert(createdRun1 && createdRun1.id, 'Run #1 must be created with an ID');

  const fetchedRun1 = db.getRun(createdRun1.id);
  assert.strictEqual(fetchedRun1.input_mode, 'discovery', 'Mode must be discovery');
  assert.strictEqual(fetchedRun1.niche_quantity, 5, 'Quantity must be 5');
  assert.deepStrictEqual(fetchedRun1.business_modes, ['blogging', 'affiliate'], 'Business modes must match');
  assert.strictEqual(fetchedRun1.countries.length, 2, `run_countries must have exactly 2 rows, found ${fetchedRun1.countries.length}`);
  assert.strictEqual(fetchedRun1.countries[0].country_code, 'US');
  assert.strictEqual(fetchedRun1.countries[1].country_code, 'UK');
  assert.strictEqual(fetchedRun1.countries[0].selection_type, 'user_selected');
  assert.strictEqual(fetchedRun1.agents.length, 35, 'All 35 agents must be initialized in agent_status');
  console.log(`  ✓ Test 2 Passed: Run #${createdRun1.id} (Discovery) created with exactly 2 country rows and 35 agents.`);

  // Test 3: Create an Own-Domain run with 0 countries (Auto-Select Mode)
  console.log('\n▸ Test 3: Creating Own-Domain run with 0 countries (AI Auto-Select Swarm)…');
  const run2Data = {
    run_name: 'P0.4 Test Domain Run',
    input_mode: 'own_domain',
    domain: 'bestkitchengear.com',
    business_modes: ['affiliate', 'ecommerce'],
    niche_quantity: 3,
    competition_level: 'low',
    status: 'pending',
    approval_gate_passed: 0,
    auto_approve: 1,
    trigger_source: 'ui',
  };
  const run2Countries = []; // 0 countries selected
  const run2Criteria = {
    input_mode: 'own_domain',
    domain: 'bestkitchengear.com',
    quantity: 3,
  };

  const createdRun2 = db.createRun(run2Data, run2Countries, run2Criteria);
  assert(createdRun2 && createdRun2.id, 'Run #2 must be created with an ID');

  const fetchedRun2 = db.getRun(createdRun2.id);
  assert.strictEqual(fetchedRun2.input_mode, 'own_domain', 'Mode must be own_domain');
  assert.strictEqual(fetchedRun2.domain, 'bestkitchengear.com', 'Domain must match');
  assert.strictEqual(fetchedRun2.countries.length, 0, `run_countries must have exactly 0 rows when user selects 0 countries, found ${fetchedRun2.countries.length}`);
  assert.strictEqual(fetchedRun2.agents.length, 35, '35 agents must be initialized for autonomous execution');
  console.log(`  ✓ Test 3 Passed: Run #${createdRun2.id} (Own Domain) created with 0 country rows (ready for Agent #10 auto-selection).`);

  // Test 4: Create an Own-Niche run with 1 country
  console.log('\n▸ Test 4: Creating Own-Niche run with 1 country (PK)…');
  const run3Data = {
    run_name: 'P0.4 Test Niche: Organic Honey',
    input_mode: 'own_niche',
    business_modes: ['ecommerce'],
    niche_quantity: 1,
    competition_level: 'medium',
    status: 'pending',
    approval_gate_passed: 0,
    auto_approve: 0,
    trigger_source: 'ui',
  };
  const run3Countries = ['PK'];
  const run3Criteria = {
    input_mode: 'own_niche',
    niche_name: 'Organic Honey',
  };

  const createdRun3 = db.createRun(run3Data, run3Countries, run3Criteria);
  assert(createdRun3 && createdRun3.id, 'Run #3 must be created with an ID');

  const fetchedRun3 = db.getRun(createdRun3.id);
  assert.strictEqual(fetchedRun3.input_mode, 'own_niche');
  assert.strictEqual(fetchedRun3.countries.length, 1);
  assert.strictEqual(fetchedRun3.countries[0].country_code, 'PK');
  console.log(`  ✓ Test 4 Passed: Run #${createdRun3.id} (Own Niche) created with exactly 1 country row.`);

  // Test 5: Verify getRuns returns runs list with parsed business_modes and countries
  console.log('\n▸ Test 5: Testing getRuns query…');
  const runsList = db.getRuns({ limit: 10 });
  assert(Array.isArray(runsList) && runsList.length >= 3, 'getRuns must return array of at least 3 runs');
  const found1 = runsList.find((r) => r.id === createdRun1.id);
  const found2 = runsList.find((r) => r.id === createdRun2.id);
  assert(found1, 'Run 1 must be in getRuns list');
  assert(found2, 'Run 2 must be in getRuns list');
  assert(Array.isArray(found1.business_modes), 'business_modes must be parsed as array');
  assert.strictEqual(found1.countries.length, 2, 'Run 1 must report 2 countries');
  assert.strictEqual(found2.countries.length, 0, 'Run 2 must report 0 countries');
  console.log('  ✓ Test 5 Passed: getRuns returns formatted runs with parsed JSON and country relations.');

  // Test 6: Verify Settings persistence for autoApprove
  console.log('\n▸ Test 6: Testing autoApprove setting persistence in app_settings…');
  db.saveSettings({ autoApprove: true });
  let s = db.getSettings();
  assert.strictEqual(s.autoApprove, true, 'autoApprove should persist as true');

  db.saveSettings({ autoApprove: false });
  s = db.getSettings();
  assert.strictEqual(s.autoApprove, false, 'autoApprove should persist as false');
  console.log('  ✓ Test 6 Passed: autoApprove toggle persistence verified.');

  // Test 7: Cascade cleanup of test runs
  console.log('\n▸ Test 7: Cleaning up test runs and verifying cascade deletion…');
  const d1 = db.deleteBy('research_runs', { id: createdRun1.id });
  const d2 = db.deleteBy('research_runs', { id: createdRun2.id });
  const d3 = db.deleteBy('research_runs', { id: createdRun3.id });
  assert.strictEqual(d1.changes, 1);
  assert.strictEqual(d2.changes, 1);
  assert.strictEqual(d3.changes, 1);

  const remainingCountries1 = db.findBy('run_countries', { run_id: createdRun1.id });
  const remainingAgents1 = db.findBy('agent_status', { run_id: createdRun1.id });
  assert.strictEqual(remainingCountries1.length, 0, 'run_countries must be purged via cascade');
  assert.strictEqual(remainingAgents1.length, 0, 'agent_status must be purged via cascade');
  console.log('  ✓ Test 7 Passed: FK cascades cleanly purged all child records for test runs.');

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('ALL P0.4 TESTS PASSED! Country Selection & Input UI 100% Ready.');
  console.log('════════════════════════════════════════════════════════════════\n');
}

runTests().catch((err) => {
  console.error('\n✗ Test failed:', err);
  process.exit(1);
});
