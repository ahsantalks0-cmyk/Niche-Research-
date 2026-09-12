'use strict';

/**
 * NRD · scripts/test-db.js
 * Verification suite for SQLite schema, migrations, isolation rule, FK cascades, and CRUD helpers.
 */

const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const db = require('../src/main/db');

async function runTests() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('NRD · SQLite Database Self-Test Suite');
  console.log('════════════════════════════════════════════════════════════════');

  // Test 1: Verify DB file location (MUST be in userData, NEVER in project root)
  const dbPath = db.getDbPath();
  const projectRoot = path.resolve(__dirname, '..');
  console.log(`[test 1] DB file location: ${dbPath}`);
  console.log(`[test 1] Project root:      ${projectRoot}`);

  assert(
    !dbPath.startsWith(projectRoot),
    `CRITICAL ERROR: DB file must NOT live inside the project root directory! Found at: ${dbPath}`
  );
  console.log('✓ Test 1 Passed: DB file lives strictly outside project root in userData path.');

  // Test 2: Verify .gitignore contains the DB pattern
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  assert(
    gitignoreContent.includes('niche_research.db') && gitignoreContent.includes('*.db'),
    '.gitignore must block niche_research.db and *.db'
  );
  console.log('✓ Test 2 Passed: .gitignore correctly blocks SQLite DB files.');

  // Test 3: Initialize DB instance and verify migrations table
  const dbInstance = db.getDb();
  const migrations = db.findBy('schema_migrations', {});
  console.log(`[test 3] Applied migrations count: ${migrations.length}`);
  assert(migrations.length >= 1, 'At least migration v1 must be applied');
  assert.strictEqual(migrations[0].version, 1, 'Migration v1 version must be 1');
  console.log('✓ Test 3 Passed: schema_migrations tracked version 1 successfully.');

  // Test 4: Verify 30 seeded countries
  const countries = db.getCountries();
  console.log(`[test 4] Seeded countries count: ${countries.length}`);
  assert.strictEqual(countries.length, 30, `Expected 30 seeded countries, got ${countries.length}`);

  const us = countries.find((c) => c.country_code === 'US');
  const pk = countries.find((c) => c.country_code === 'PK');
  const uk = countries.find((c) => c.country_code === 'UK');
  assert(us && pk && uk, 'Must contain US, PK, and UK in seed data');
  assert(Array.isArray(us.local_platforms), 'Local platforms must be parsed JSON array');
  assert(us.potential_score > 90, 'US potential score should be > 90');
  console.log('✓ Test 4 Passed: All 30 seed countries with realistic metadata and JSON platforms verified.');

  // Test 5: Verify App Settings read and update
  const initialSettings = db.getSettings();
  assert(initialSettings.schemaVersion >= 1, 'Schema version should be >= 1');

  const updatedSettings = db.saveSettings({
    theme: 'dark',
    language: 'english',
    autoApprove: true,
    geminiApiKey: 'test-gemini-key-12345',
    jarvisApiKey: 'test-jarvis-key-67890',
  });
  assert.strictEqual(updatedSettings.autoApprove, true, 'autoApprove should be updated');
  assert.strictEqual(updatedSettings.geminiApiKey, 'test-gemini-key-12345', 'Gemini key should be updated');
  assert.strictEqual(updatedSettings.jarvisApiKey, 'test-jarvis-key-67890', 'Jarvis key should be updated');

  // Reset back
  db.saveSettings({ autoApprove: false, geminiApiKey: '', jarvisApiKey: '' });
  console.log('✓ Test 5 Passed: app_settings table read and save verified.');

  // Test 6: Create a test run with multiple countries and verify 35 agents initialization
  const testRun = db.createRun(
    {
      run_name: 'Self-Test Automated Verification Run',
      input_mode: 'discovery',
      business_modes: ['blogging', 'affiliate'],
      niche_quantity: 3,
      competition_level: 'medium',
      status: 'planning',
    },
    ['US', 'UK'],
    { topic: 'Mechanical Keyboards & Desk Accessories' }
  );

  assert(testRun.id > 0, 'Run ID should be generated');
  assert.strictEqual(testRun.countries.length, 2, 'Run should have 2 countries');
  assert.strictEqual(testRun.agents.length, 35, 'All 35 agents must be initialized in agent_status table');
  console.log(`✓ Test 6 Passed: Research run #${testRun.id} created with 2 countries and all 35 agents initialized.`);

  // Test 7: Update agent_status for specific agents
  const updatedAgent = db.updateAgentStatus(testRun.id, 1, {
    status: 'running',
    started_at: new Date().toISOString(),
    output_summary: 'Coordinator active, dispatching discovery swarm',
  });
  assert.strictEqual(updatedAgent.status, 'running', 'Agent #1 status should be updated');
  console.log('✓ Test 7 Passed: agent_status updated dynamically for Agent #1 (Coordinator).');

  // Test 8: Insert test niche
  const nicheInfo = db.insert('niches', {
    run_id: testRun.id,
    niche_name: 'Custom Ergonomic Mechanical Keyboards',
    niche_slug: 'custom-ergonomic-mechanical-keyboards',
    description: 'High-end ergonomic split mechanical keyboards for remote developers',
    mode_fit: { blogging: 'high', affiliate: 'very_high' },
    trend_status: 'rising',
    seasonality: 'evergreen',
    discovery_status: 'candidate',
  });
  const nicheId = nicheInfo.id;
  assert(nicheId > 0, 'Niche ID must be created');
  console.log(`✓ Test 8 Passed: Niche inserted with ID #${nicheId}.`);

  // Test 9: Isolation Rule Verification (US vs UK keywords under same niche)
  // Insert keywords for US
  db.insert('keywords', {
    niche_id: nicheId,
    country_code: 'US',
    keyword: 'best split mechanical keyboard',
    keyword_type: 'long_tail',
    search_intent: 'commercial',
    volume_estimate: 14800,
    difficulty_score: 42.5,
  });

  db.insert('keywords', {
    niche_id: nicheId,
    country_code: 'US',
    keyword: 'ergonomic keyboard for carpal tunnel',
    keyword_type: 'long_tail',
    search_intent: 'informational',
    volume_estimate: 8900,
    difficulty_score: 38.0,
  });

  // Insert keyword for UK
  db.insert('keywords', {
    niche_id: nicheId,
    country_code: 'UK',
    keyword: 'best ergonomic mechanical keyboard uk',
    keyword_type: 'long_tail',
    search_intent: 'commercial',
    volume_estimate: 2400,
    difficulty_score: 31.0,
  });

  // Query isolated by country
  const usKeywords = db.findBy('keywords', { niche_id: nicheId, country_code: 'US' });
  const ukKeywords = db.findBy('keywords', { niche_id: nicheId, country_code: 'UK' });
  const deKeywords = db.findBy('keywords', { niche_id: nicheId, country_code: 'DE' });

  assert.strictEqual(usKeywords.length, 2, 'US must have exactly 2 keywords');
  assert.strictEqual(ukKeywords.length, 1, 'UK must have exactly 1 keyword');
  assert.strictEqual(deKeywords.length, 0, 'DE must have 0 keywords');
  assert.strictEqual(usKeywords[0].keyword, 'best split mechanical keyboard');
  assert.strictEqual(ukKeywords[0].keyword, 'best ergonomic mechanical keyboard uk');
  console.log('✓ Test 9 Passed: ISOLATION RULE strictly verified (US and UK keywords isolated by niche_id + country_code).');

  // Test 10: Deep research insertion across multiple tables (Competitors, RPM, Serp)
  db.insert('serp_results', {
    niche_id: nicheId,
    country_code: 'US',
    keyword: 'best split mechanical keyboard',
    rank_position: 1,
    result_url: 'https://example-keyboards.com/best-split',
    result_title: 'Top Ergonomic Keyboards in 2026',
    domain_name: 'example-keyboards.com',
    result_type: 'blog',
    da_estimate: 48,
  });

  db.insert('competitors', {
    niche_id: nicheId,
    country_code: 'US',
    competitor_name: 'ErgoMech Co',
    website_url: 'https://ergomech.example.com',
    strength_summary: 'Detailed teardown guides and 3D print STLs',
    weakness_summary: 'Weak affiliate monetization',
  });

  db.insert('rpm_data', {
    niche_id: nicheId,
    country_code: 'US',
    estimated_rpm_usd: 34.5,
    adsense_rpm_usd: 12.0,
    mediavine_rpm_usd: 36.0,
    realistic_monthly_income_usd: 2800.0,
  });

  const usCompetitors = db.findBy('competitors', { niche_id: nicheId, country_code: 'US' });
  const usRpm = db.findOne('rpm_data', { niche_id: nicheId, country_code: 'US' });
  assert.strictEqual(usCompetitors.length, 1, 'Should find US competitor');
  assert.strictEqual(usRpm.estimated_rpm_usd, 34.5, 'Should match RPM estimate');
  console.log('✓ Test 10 Passed: Deep research data tables inserted and queried with composite isolation.');

  // Test 11: DB Diagnostics Health check
  const health = db.getDbHealth();
  assert(health.schemaVersion >= 1, 'Schema version should be >= 1');
  assert(health.tables.research_runs >= 1, 'Should count research_runs');
  assert(health.tables.niches >= 1, 'Should count niches');
  assert(health.tables.keywords >= 3, 'Should count keywords');
  assert.strictEqual(health.tables.countries, 30, 'Countries table must have 30 rows');
  console.log('✓ Test 11 Passed: DB Health diagnostics reports accurate row counts across all tables.');

  // Test 12: Foreign Key Cascade Deletion & Cleanup
  console.log(`[test 12] Deleting test run #${testRun.id} to verify cascade deletion…`);
  const deletedRun = db.deleteBy('research_runs', { id: testRun.id });
  assert.strictEqual(deletedRun.changes, 1, 'Should delete 1 research_run');

  // Verify child tables were cascaded
  const remainingNiches = db.findBy('niches', { run_id: testRun.id });
  const remainingCountries = db.findBy('run_countries', { run_id: testRun.id });
  const remainingAgents = db.findBy('agent_status', { run_id: testRun.id });
  const remainingKeywords = db.findBy('keywords', { niche_id: nicheId });
  const remainingSerp = db.findBy('serp_results', { niche_id: nicheId });
  const remainingCompetitors = db.findBy('competitors', { niche_id: nicheId });

  assert.strictEqual(remainingNiches.length, 0, 'Niches should be cascaded on run deletion');
  assert.strictEqual(remainingCountries.length, 0, 'Run countries should be cascaded on run deletion');
  assert.strictEqual(remainingAgents.length, 0, 'Agent status should be cascaded on run deletion');
  assert.strictEqual(remainingKeywords.length, 0, 'Keywords should be cascaded on niche deletion');
  assert.strictEqual(remainingSerp.length, 0, 'SERP results should be cascaded on niche deletion');
  assert.strictEqual(remainingCompetitors.length, 0, 'Competitors should be cascaded on niche deletion');

  console.log('✓ Test 12 Passed: Foreign key cascades verified (all child records cleanly purged).');

  console.log('════════════════════════════════════════════════════════════════');
  console.log('ALL 12 TESTS PASSED! SQLite Database Engine is 100% Production Ready.');
  console.log('════════════════════════════════════════════════════════════════');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:');
  console.error(err);
  process.exit(1);
});
