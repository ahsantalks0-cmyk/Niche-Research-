#!/usr/bin/env node
'use strict';

/**
 * NRD · test-p11.js — P1.1 Criteria Parser Agent Test Suite
 * 
 * Tests the translation of raw user commissions into structured Mission Briefs:
 * - Discovery Mode with user-selected countries
 * - Discovery Mode with 0 countries (Auto-Potential Swarm)
 * - Own Domain Mode with domain normalization & domain fit directive
 * - Own Niche Mode with forced quantity=1 & candidate niche extraction
 * - Validation failure handling (invalid quantities / missing fields)
 * - Re-parsing & version bumping without duplicate rows
 * - Timing logs instrumentation & agent_status matrix updates
 */

const assert = require('assert');
const db = require('../src/main/db.js');
const { parseRun, cleanDomainInput, isValidDomain } = require('../src/main/agents/criteriaParser.js');

console.log('════════════════════════════════════════════════════════════════');
console.log('NRD · P1.1 Criteria Parser Agent (#2) Test Suite');
console.log('════════════════════════════════════════════════════════════════');

async function runTests() {
  const dbInstance = db.getDb();
  db.runMigrations(dbInstance);

  const createdTestRunIds = [];

  try {
    // -------------------------------------------------------------
    // Test 1: Domain validation helper tests
    // -------------------------------------------------------------
    console.log('\n▸ Test 1: Domain sanitizer and validator…');
    assert.strictEqual(cleanDomainInput('https://www.BestKitchenGear.com/path?arg=1'), 'bestkitchengear.com');
    assert.strictEqual(isValidDomain('bestkitchengear.com'), true);
    assert.strictEqual(isValidDomain('sub.domain.co.uk'), true);
    assert.strictEqual(isValidDomain('invalid domain name'), false);
    assert.strictEqual(isValidDomain(''), false);
    console.log('  ✓ Test 1 Passed: Domain cleaner & validator operates accurately.');

    // -------------------------------------------------------------
    // Test 2: Discovery run with 2 user countries (US, UK)
    // -------------------------------------------------------------
    console.log('\n▸ Test 2: Parsing Discovery run with 2 user-selected countries (US, UK)…');
    const run1Data = {
      run_name: 'P1.1 Test Discovery Run',
      input_mode: 'discovery',
      business_modes: ['blogging', 'affiliate', 'ecommerce', 'digital_products'],
      niche_quantity: 20,
      competition_level: 'medium',
      status: 'pending',
      approval_gate_passed: 0,
      auto_approve: 0,
      trigger_source: 'ui',
    };
    const run1Countries = ['US', 'UK'];
    const run1Created = db.createRun(run1Data, run1Countries, {});
    createdTestRunIds.push(run1Created.id);

    // createRun automatically invokes parseRun, producing version 1.0
    const fetchedRun1 = db.getRun(run1Created.id);
    assert.strictEqual(fetchedRun1.status, 'planning', 'Status must transition to planning');
    assert.strictEqual(fetchedRun1.error_summary, null, 'Error summary must be null');
    assert(fetchedRun1.criteria, 'Criteria record must exist');
    assert.strictEqual(fetchedRun1.criteria.parser_version, '1.0');

    const brief1 = fetchedRun1.criteria.parsed_brief;
    assert(brief1, 'Brief must exist');
    assert.strictEqual(brief1.niche_quantity, 20);
    assert.strictEqual(brief1.input_mode, 'discovery');
    assert.strictEqual(brief1.countries.mode, 'user_selected');
    assert.strictEqual(brief1.countries.list.length, 2);
    assert.strictEqual(brief1.countries.list[0].code, 'US');
    assert.strictEqual(brief1.countries.list[1].code, 'UK');
    assert.strictEqual(brief1.approval_gate.auto_approve, false);
    assert(brief1.business_mode_directives.blogging, 'Blogging directive must exist');
    assert(brief1.business_mode_directives.affiliate, 'Affiliate directive must exist');
    assert(brief1.mode_weights_hint.ecommerce, 'Ecommerce weight hint must exist');

    const agent2Status1 = fetchedRun1.agents.find((a) => a.agent_number === 2);
    assert(agent2Status1, 'Agent #2 status row must exist');
    assert.strictEqual(agent2Status1.status, 'done', 'Agent #2 status must be done');
    assert.strictEqual(agent2Status1.agent_name, 'Criteria Parser Agent', 'Agent name must be Criteria Parser Agent');
    assert(agent2Status1.output_summary.includes('Brief v'), 'Output summary should mention Brief version');
    console.log(`  ✓ Test 2 Passed: Run #${run1Created.id} automatically parsed to Mission Brief (v${fetchedRun1.criteria.parser_version}).`);

    // -------------------------------------------------------------
    // Test 3: Discovery run with 0 countries (Auto-Potential)
    // -------------------------------------------------------------
    console.log('\n▸ Test 3: Parsing Discovery run with 0 countries (Auto-Potential Swarm)…');
    const run2Data = {
      run_name: 'P1.1 Test Auto-Country Run',
      input_mode: 'discovery',
      business_modes: ['blogging', 'digital_products'],
      niche_quantity: 15,
      competition_level: 'low',
      status: 'pending',
      approval_gate_passed: 0,
      auto_approve: 1,
      trigger_source: 'ui',
    };
    const run2Created = db.createRun(run2Data, [], {});
    createdTestRunIds.push(run2Created.id);

    const fetchedRun2 = db.getRun(run2Created.id);
    const brief2 = fetchedRun2.criteria.parsed_brief;
    assert.strictEqual(brief2.countries.mode, 'auto_potential');
    assert.strictEqual(brief2.countries.list.length, 0);
    assert(brief2.countries.rule.includes('Agent #10 selects all potential countries'));
    assert.strictEqual(brief2.approval_gate.auto_approve, true);
    console.log(`  ✓ Test 3 Passed: Run #${run2Created.id} correctly configured for Agent #10 auto-selection.`);

    // -------------------------------------------------------------
    // Test 4: Own Domain Run
    // -------------------------------------------------------------
    console.log('\n▸ Test 4: Parsing Own Domain run with domain fit directive…');
    const run3Data = {
      run_name: 'P1.1 Test Domain Run',
      input_mode: 'own_domain',
      domain: 'https://www.BestKitchenGear.com/reviews',
      business_modes: ['affiliate', 'ecommerce'],
      niche_quantity: 10,
      competition_level: 'any',
      status: 'pending',
      auto_approve: 0,
    };
    const run3Created = db.createRun(run3Data, ['US', 'CA', 'DE'], {});
    createdTestRunIds.push(run3Created.id);

    const fetchedRun3 = db.getRun(run3Created.id);
    const brief3 = fetchedRun3.criteria.parsed_brief;
    assert.strictEqual(brief3.domain, 'bestkitchengear.com');
    assert.strictEqual(brief3.niche_quantity, 10);
    assert(brief3.domain_fit_directive.includes('Every report section must reference how/why each niche fits this domain'));
    console.log(`  ✓ Test 4 Passed: Run #${run3Created.id} domain normalized and domain_fit_directive attached.`);

    // -------------------------------------------------------------
    // Test 5: Own Niche Run (Forced quantity = 1 & candidate niche)
    // -------------------------------------------------------------
    console.log('\n▸ Test 5: Parsing Own Niche run (forced quantity=1)…');
    const run4Data = {
      run_name: 'Validation: Handmade Mechanical Keyboards',
      own_niche_name: 'Handmade Mechanical Keyboards',
      input_mode: 'own_niche',
      business_modes: ['ecommerce', 'digital_products'],
      niche_quantity: 50, // User entered 50, but own_niche MUST force 1
      competition_level: 'medium',
      status: 'pending',
      auto_approve: 1,
    };
    const run4Created = db.createRun(run4Data, ['JP', 'US'], {});
    createdTestRunIds.push(run4Created.id);

    const fetchedRun4 = db.getRun(run4Created.id);
    const brief4 = fetchedRun4.criteria.parsed_brief;
    assert.strictEqual(brief4.niche_quantity, 1, 'Own niche mode MUST force quantity to 1');
    assert.strictEqual(brief4.own_niche_name, 'Handmade Mechanical Keyboards');
    assert.strictEqual(brief4.domain, null);
    assert.strictEqual(fetchedRun4.niche_quantity, 1, 'research_runs.niche_quantity must be forced to 1');
    assert.strictEqual(fetchedRun4.own_niche_name, 'Handmade Mechanical Keyboards');
    console.log(`  ✓ Test 5 Passed: Run #${run4Created.id} (Own Niche) forced to 1 niche and candidate preserved.`);

    // -------------------------------------------------------------
    // Test 6: Validation Failure Handling (Invalid Quantity)
    // -------------------------------------------------------------
    console.log('\n▸ Test 6: Validating error handling on invalid quantity…');
    const run5Data = {
      run_name: 'P1.1 Invalid Quantity Run',
      input_mode: 'discovery',
      business_modes: ['blogging'],
      niche_quantity: 0, // Invalid
      status: 'pending',
    };
    // Insert directly into DB to bypass any UI safeguards
    const run5Info = db.insert('research_runs', {
      run_name: run5Data.run_name,
      input_mode: run5Data.input_mode,
      business_modes: JSON.stringify(run5Data.business_modes),
      niche_quantity: 0,
      status: 'pending',
    });
    createdTestRunIds.push(run5Info.id);

    // Initialize agent_status for agent #2
    db.insert('agent_status', {
      run_id: run5Info.id,
      agent_number: 2,
      agent_name: 'Criteria Parser Agent',
      layer: 'control',
      status: 'idle',
    });

    const parseResult5 = parseRun(run5Info.id);
    assert.strictEqual(parseResult5.success, false, 'Should fail validation');
    assert(parseResult5.error.includes('niche_quantity'), 'Error message must specify niche_quantity issue');

    const fetchedRun5 = db.getRun(run5Info.id);
    assert.strictEqual(fetchedRun5.status, 'failed', 'Status must transition to failed');
    assert(fetchedRun5.error_summary.includes('niche_quantity'), 'error_summary must be set in research_runs');

    const agent2Status5 = fetchedRun5.agents.find((a) => a.agent_number === 2);
    assert.strictEqual(agent2Status5.status, 'failed', 'Agent #2 status must be marked failed');
    assert(agent2Status5.last_error.includes('niche_quantity'), 'Agent #2 last_error must record failure');
    console.log(`  ✓ Test 6 Passed: Invalid run #${run5Info.id} safely failed with error logged.`);

    // -------------------------------------------------------------
    // Test 7: Re-parsing & Version Bumping
    // -------------------------------------------------------------
    console.log('\n▸ Test 7: Re-parsing existing run & asserting version bump…');
    const initialRun = db.getRun(run1Created.id);
    const initialVersion = initialRun.criteria.parser_version;
    assert.strictEqual(initialVersion, '1.0', 'Initial version should be 1.0');

    // Re-parse run #1
    const reparseResult = parseRun(run1Created.id);
    assert.strictEqual(reparseResult.success, true);
    assert.strictEqual(reparseResult.version, '1.1', 'Re-parse should bump version to 1.1');
    assert.strictEqual(reparseResult.brief.brief_version, '1.1');

    // Verify only ONE run_criteria row exists for this run (no duplicates)
    const allCriteriaRows = dbInstance.prepare('SELECT * FROM run_criteria WHERE run_id = ?').all(run1Created.id);
    assert.strictEqual(allCriteriaRows.length, 1, 'Exactly one criteria record must exist per run');
    assert.strictEqual(allCriteriaRows[0].parser_version, '1.1');
    console.log(`  ✓ Test 7 Passed: Run #${run1Created.id} re-parsed cleanly to v1.1 with zero duplicate rows.`);

    // -------------------------------------------------------------
    // Test 8: Timing logs check
    // -------------------------------------------------------------
    console.log('\n▸ Test 8: Verifying timing logs instrumentation for criteria parser…');
    const timingRows = db.getTimingLogs({ runId: run1Created.id });
    const parserTiming = timingRows.find((t) => t.operation === 'criteria_parse' && t.agent_number === 2);
    assert(parserTiming, 'Timing log row for criteria_parse must exist');
    assert(parserTiming.duration_ms >= 0, 'duration_ms must be non-negative number');
    console.log(`  ✓ Test 8 Passed: Timing log verified (${parserTiming.duration_ms}ms logged for Agent #2).`);

  } finally {
    // Cleanup test data
    console.log('\n▸ Cleaning up test artifacts…');
    for (const id of createdTestRunIds) {
      dbInstance.prepare('DELETE FROM run_countries WHERE run_id = ?').run(id);
      dbInstance.prepare('DELETE FROM run_criteria WHERE run_id = ?').run(id);
      dbInstance.prepare('DELETE FROM agent_status WHERE run_id = ?').run(id);
      dbInstance.prepare('DELETE FROM timing_logs WHERE run_id = ?').run(id);
      dbInstance.prepare('DELETE FROM research_runs WHERE id = ?').run(id);
    }
    console.log(`  ✓ Cleaned up ${createdTestRunIds.length} test runs.`);
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ ALL P1.1 CRITERIA PARSER AGENT TESTS PASSED SUCCESSFULLY!');
  console.log('════════════════════════════════════════════════════════════════\n');
}

runTests().catch((err) => {
  console.error('\n❌ P1.1 Test Suite Error:', err);
  process.exit(1);
});
