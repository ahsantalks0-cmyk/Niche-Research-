'use strict';

/**
 * NRD · departmentHead.js — Department Head Agent (Agent #1).
 * 
 * ROLE:
 * The Master Plan Maker and Orchestrator of the Niche Research Department.
 * 
 * RESPONSIBILITIES:
 * 1. Picks up runs in status='planning' (handoff from Criteria Parser Agent #2).
 * 2. Reads the validated Mission Brief (run_criteria.parsed_brief).
 * 3. Builds a COMPLETE EXECUTION PLAN (dh_execution_plan) with phases, dependencies,
 *    conditional branches, parallel scope, and approval gate positioning.
 * 4. Persists the execution plan into research_runs.dh_execution_plan.
 * 5. Hands off to the Chain Engine for sequential / parallel agent execution.
 */

const db = require('../db');
const agentRegistry = require('../engine/agentRegistry');

let browserEngine = null;
function getBrowserEngine() {
  if (!browserEngine) {
    try {
      const engine = require('../engine');
      browserEngine = engine.browserEngine;
    } catch {
      browserEngine = {
        log: (level, msg) => {
          console.log(`[NRD · ${level.toUpperCase()}] ${msg}`);
        },
      };
    }
  }
  return browserEngine;
}

/**
 * Builds the complete multi-phase execution plan for a given research run.
 * 
 * @param {number} runId The research run ID
 * @returns {object} The complete dh_execution_plan object
 */
function buildPlan(runId) {
  const t0 = Date.now();
  const startedAt = new Date().toISOString();
  const engine = getBrowserEngine();

  engine.log('info', `👑 Department Head: Building execution plan for Run #${runId}…`);

  const dbInstance = db.getDb();

  // 1. Fetch the run record & criteria brief
  const run = dbInstance.prepare('SELECT * FROM research_runs WHERE id = ?').get(runId);
  if (!run) {
    throw new Error(`Run #${runId} not found in database.`);
  }

  const criteriaRow = dbInstance.prepare('SELECT * FROM run_criteria WHERE run_id = ?').get(runId);
  if (!criteriaRow || !criteriaRow.parsed_brief) {
    throw new Error(`Run #${runId} has no parsed mission brief in run_criteria.`);
  }

  let brief = null;
  try {
    brief = typeof criteriaRow.parsed_brief === 'string' ? JSON.parse(criteriaRow.parsed_brief) : criteriaRow.parsed_brief;
  } catch (err) {
    throw new Error(`Failed to parse mission brief JSON for Run #${runId}: ${err.message}`);
  }

  // Update Agent #1 status to running
  try {
    dbInstance.prepare(`
      UPDATE agent_status 
      SET status = 'running', started_at = ?, last_error = NULL, updated_at = datetime('now')
      WHERE run_id = ? AND agent_number = 1
    `).run(startedAt, runId);
  } catch (err) {
    console.warn(`[departmentHead] Could not update agent_status: ${err.message}`);
  }

  // 2. Extract Brief Directives & Conditional Rules
  const inputMode = brief.input_mode || run.input_mode || 'discovery';
  const countriesMode = brief.countries?.mode || 'user_selected';
  const countriesList = Array.isArray(brief.countries?.list) ? brief.countries.list : [];
  const nicheQuantity = Number(brief.niche_quantity) || 1;
  const isAutoApprove = Boolean(brief.approval_gate?.auto_approve || run.auto_approve);
  const businessModes = Array.isArray(brief.business_modes) ? brief.business_modes : [];
  const targetDomain = brief.target_domain || run.domain || null;
  const candidateNiche = brief.target_niche || run.own_niche_name || null;

  // 3. Assemble Phase 1: Discovery Phase Agents (Agents 6–10)
  const discoveryAgents = [
    {
      number: 6,
      name: 'Niche Discovery',
      status: agentRegistry.isRegistered(6) ? 'registered' : 'pending',
      depends_on: [],
      critical: true,
      directive: inputMode === 'own_niche'
        ? `Single-niche validation mode for "${candidateNiche}" (quantity=1)`
        : inputMode === 'own_domain'
          ? `Discover ${nicheQuantity} adjacent niches strictly fitting domain ${targetDomain}`
          : `Discover ${nicheQuantity} viable seed niches`,
    },
    {
      number: 7,
      name: 'Trend & Demand Signal',
      status: agentRegistry.isRegistered(7) ? 'registered' : 'pending',
      depends_on: [6],
      critical: true,
      directive: 'Analyze 5-year macro search trajectory and demand volatility',
    },
    {
      number: 8,
      name: 'Quick Competition Screener',
      status: agentRegistry.isRegistered(8) ? 'registered' : 'pending',
      depends_on: [7],
      critical: true,
      directive: 'Surface low/medium barrier opportunities per brief criteria',
    },
    {
      number: 9,
      name: 'Duplicate & History Check',
      status: agentRegistry.isRegistered(9) ? 'registered' : 'pending',
      depends_on: [8],
      critical: false,
      directive: 'Deduplicate candidate niches against historical ledger',
    },
  ];

  // Conditional Logic: Agent #10 (Country Potential Intelligence)
  if (countriesMode === 'auto_potential') {
    discoveryAgents.push({
      number: 10,
      name: 'Country Potential Intelligence',
      status: agentRegistry.isRegistered(10) ? 'registered' : 'pending',
      depends_on: [8],
      critical: true,
      condition: "countries.mode == 'auto_potential'",
      directive: 'Autonomous market scan: rank & select all potential geographic countries',
    });
  } else {
    engine.log('info', `👑 Department Head: Agent #10 skipped — user explicitly provided ${countriesList.length} countries.`);
  }

  // 4. Assemble Phase 2: Deep Research Phase (Agents 11–26)
  // Scope: per approved niche × per country (using P0.5 slot pool + shared cache)
  const deepResearchAgents = [
    { number: 11, name: 'Keyword Research', depends_on: [], critical: false },
    { number: 12, name: 'SERP Analysis', depends_on: [11], critical: false },
    { number: 13, name: 'Competitor Deep-Dive', depends_on: [12], critical: false },
    { number: 14, name: 'Content Gap Analysis', depends_on: [12], critical: false },
    { number: 15, name: 'Unmet Search Intent', depends_on: [11, 14], critical: false },
    { number: 16, name: 'Social Media Competition', depends_on: [13], critical: false },
    { number: 17, name: 'Paid Ads Competition', depends_on: [11], critical: false },
    { number: 18, name: 'Monetization & Digital Product', depends_on: [11, 15], critical: false },
    { number: 19, name: 'E-commerce Product Research', depends_on: [13], critical: false },
    { number: 20, name: 'Digital Product List', depends_on: [18], critical: false },
    { number: 21, name: 'E-commerce Product List', depends_on: [19], critical: false },
    { number: 22, name: 'Affiliate Program Research', depends_on: [11, 13], critical: false },
    { number: 23, name: 'Ad Revenue & RPM', depends_on: [11, 12], critical: false },
    { number: 24, name: 'Audience & Persona', depends_on: [15, 16], critical: false },
    { number: 25, name: 'Country Localization', depends_on: [12, 24], critical: false },
    {
      number: 26,
      name: 'Domain & Brand Availability',
      depends_on: [11, 24],
      critical: false,
      directive: inputMode === 'own_domain'
        ? `Domain Fit Analysis for ${targetDomain}: verify adjacent expansion compatibility`
        : 'Analyze TLD availability & brandability candidates',
    },
  ].map((ag) => ({
    ...ag,
    status: agentRegistry.isRegistered(ag.number) ? 'registered' : 'pending',
    scope: 'per approved niche × per country',
    parallelism: 'use P0.5 slot pool + multi-country tabs + shared cache',
  }));

  // 5. Assemble Phase 3: Scoring Phase (Agents 27–30)
  const scoringAgents = [
    { number: 27, name: 'Country Benchmarking', depends_on: [25], critical: false },
    { number: 28, name: 'Opportunity Scoring', depends_on: [27, 23, 22, 18, 19], critical: false },
    { number: 29, name: 'Final Verdict', depends_on: [28], critical: false },
    { number: 30, name: 'Risk & Compliance', depends_on: [28, 29], critical: false },
  ].map((ag) => ({
    ...ag,
    status: agentRegistry.isRegistered(ag.number) ? 'registered' : 'pending',
  }));

  // 6. Assemble Phase 4: QA & Reporting Phase (Agents 31–35)
  const qaReportingAgents = [
    { number: 31, name: 'Quality Supervisor (Audit)', depends_on: [29, 30], critical: false },
    { number: 32, name: 'QA & Validation', depends_on: [31], critical: false },
    { number: 33, name: 'Report Specialist', depends_on: [32], critical: false },
    { number: 34, name: 'SEO Department Handoff', depends_on: [33], critical: false },
    { number: 35, name: 'Re-Research Manager', depends_on: [33], critical: false },
  ].map((ag) => ({
    ...ag,
    status: agentRegistry.isRegistered(ag.number) ? 'registered' : 'pending',
  }));

  // 7. Calculate Estimated Research Units
  const countryCountEst = countriesMode === 'auto_potential' ? 'auto' : countriesList.length || 1;
  const totalUnits = typeof countryCountEst === 'number'
    ? `${nicheQuantity} × ${countryCountEst} = ${nicheQuantity * countryCountEst} units`
    : `${nicheQuantity} × auto countries`;

  // 8. Construct the Master Execution Plan
  const allNodes = [...discoveryAgents, ...deepResearchAgents, ...scoringAgents, ...qaReportingAgents];
  const plan = {
    plan_version: '1.0',
    run_id: Number(runId),
    input_mode: inputMode,
    estimated_scope: totalUnits,
    agent_nodes: allNodes,
    plan_summary: {
      total_phases: 4,
      discovery_agent_count: discoveryAgents.length,
      agent_10_status: countriesMode === 'auto_potential' ? 'included' : 'excluded',
      approval_gate_mode: isAutoApprove ? 'auto' : 'manual',
    },
    created_at: new Date().toISOString(),
    brief_snapshot: brief,
    phases: [
      {
        phase: 'discovery',
        name: 'Phase 1: Niche Discovery & Screening',
        agents: discoveryAgents,
        gate_after: isAutoApprove ? 'approval_gate (skipped: auto_approve=true)' : 'approval_gate',
      },
      {
        phase: 'deep_research',
        name: 'Phase 2: Deep 360° Multi-Country Research',
        agents: deepResearchAgents,
        scope: 'per approved niche × per country',
        parallelism: 'use P0.5 slot pool + multi-country tabs + shared cache',
      },
      {
        phase: 'scoring',
        name: 'Phase 3: Intelligence & Opportunity Scoring',
        agents: scoringAgents,
      },
      {
        phase: 'qa_reporting',
        name: 'Phase 4: Quality Assurance & Dossier Compilation',
        agents: qaReportingAgents,
      },
    ],
    special_agents: {
      quality_supervisor: { number: 3, mode: 'shadow — runs DURING all phases, can send any agent output back' },
      scheduler: { number: 4, mode: 'trigger-only' },
      jarvis_gateway: { number: 5, mode: 'external-trigger-only' },
      senior_consultant: { number: 36, mode: 'on-demand chat' },
    },
    approval_gate: {
      enabled: !isAutoApprove,
      auto_approved: isAutoApprove,
      position: 'after discovery phase, before deep_research',
    },
    estimated_scope: {
      niches: nicheQuantity,
      countries: countryCountEst,
      total_research_units: totalUnits,
    },
    emphasis_map: brief.mode_weights_hint || {},
  };

  // 9. Persist Plan in SQLite Database
  const durationMs = Date.now() - t0;
  const endedAt = new Date().toISOString();

  const persistTx = dbInstance.transaction(() => {
    // Save execution plan to research_runs
    dbInstance.prepare(`
      UPDATE research_runs 
      SET dh_execution_plan = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(plan), runId);

    // Update Agent #1 status in agent_status
    const planSummary = `Execution Plan v1.0 created — 4 phases, ${discoveryAgents.length} discovery agents, gate=${isAutoApprove ? 'auto' : 'manual'}`;
    dbInstance.prepare(`
      UPDATE agent_status 
      SET status = 'done',
          last_error = NULL,
          output_summary = ?,
          output_payload = ?,
          finished_at = ?,
          updated_at = datetime('now')
      WHERE run_id = ? AND agent_number = 1
    `).run(planSummary, JSON.stringify(plan), endedAt, runId);

    // Record Timing
    try {
      db.insert('timing_logs', {
        run_id: runId,
        task_ref: `department_head_plan_run_${runId}`,
        agent_number: 1,
        operation: 'dh_build_plan',
        started_at: startedAt,
        ended_at: endedAt,
        duration_ms: Math.max(1, durationMs),
        cache_hit: 0,
      });
    } catch (err) {
      console.warn(`[departmentHead] Timing log warning: ${err.message}`);
    }
  });

  persistTx();

  engine.log('info', `✅ Department Head: Master plan ready for Run #${runId} (${plan.phases.length} phases, ${totalUnits})`);

  return plan;
}

// Register Agent #1 in Agent Registry
agentRegistry.register(
  1,
  'Department Head Agent',
  'control',
  async (ctx) => {
    return buildPlan(ctx.runId);
  },
  {
    inputs: ['run_criteria.parsed_brief'],
    outputs: ['research_runs.dh_execution_plan'],
    isCritical: true,
  }
);

// Register Agent #2 (Criteria Parser) in Agent Registry
agentRegistry.register(
  2,
  'Criteria Parser Agent',
  'control',
  async (ctx) => {
    const { parseRun } = require('./criteriaParser');
    return parseRun(ctx.runId);
  },
  {
    inputs: ['research_runs', 'run_countries'],
    outputs: ['run_criteria.parsed_brief'],
    isCritical: true,
  }
);

module.exports = {
  buildPlan,
};
