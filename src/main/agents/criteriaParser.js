'use strict';

/**
 * NRD · criteriaParser.js — Criteria Parser Agent (Agent #2).
 * 
 * ROLE:
 * The Translator of the Niche Research Department (First agent of the Control Layer).
 * Transforms raw user commission input from research_runs + run_countries into a
 * strictly validated, structured MISSION BRIEF stored in run_criteria.
 * 
 * INHERITED CONTRACTS:
 * - Depth is sacred: Every selected mode carries its focus directive; all agents follow this brief.
 * - Speed contract: Fast synchronous pure logic (< 50ms), timing logged to timing_logs.
 * - Multi-Department Isolation: Emits through engine logger, operates cleanly on SQLite.
 */

const db = require('../db');
let browserEngine = null;

function getBrowserEngine() {
  if (!browserEngine) {
    try {
      const engine = require('../engine');
      browserEngine = engine.browserEngine;
    } catch {
      // Fallback logger if engine not initialized
      browserEngine = {
        log: (level, msg) => {
          console.log(`[NRD · ${level.toUpperCase()}] ${msg}`);
        },
      };
    }
  }
  return browserEngine;
}

const VALID_INPUT_MODES = new Set(['discovery', 'own_niche', 'own_domain']);
const VALID_BUSINESS_MODES = new Set(['blogging', 'affiliate', 'ecommerce', 'digital_products']);
const VALID_COMPETITION_LEVELS = new Set(['low', 'medium', 'any']);

const BUSINESS_MODE_DIRECTIVES = {
  blogging: 'Focus on RPM, informational search intent, ad network eligibility (Mediavine/Raptive/AdSense), and content volume opportunities.',
  affiliate: 'Focus on high-ticket affiliate programs, commission rates (Amazon vs Direct), cookie durations, and buyer-intent review queries.',
  ecommerce: 'Focus on physical product demand, Amazon FBA feasibility, unit economics, supply chain margins, and private label gaps.',
  digital_products: 'Focus on digital downloads, templates, SaaS tools, course demand, marketplace gaps (Etsy/Gumroad/Shopify), and 90%+ margin potential.',
};

const MODE_WEIGHTS_HINT = {
  blogging: { rpm_weight: 'high' },
  affiliate: { commission_weight: 'high' },
  ecommerce: { margin_demand_weight: 'high' },
  digital_products: { marketplace_demand_weight: 'high' },
};

/**
 * Strips protocol, www, paths, ports, and query parameters from domain input.
 * @param {string} raw
 * @returns {string}
 */
function cleanDomainInput(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//i, '');
  d = d.replace(/^www\./i, '');
  d = d.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
  return d;
}

/**
 * Validates domain format (name.tld).
 * @param {string} domain
 * @returns {boolean}
 */
function isValidDomain(domain) {
  const clean = cleanDomainInput(domain);
  if (!clean) return false;
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(clean);
}

/**
 * Parses and validates a research run, producing a structured Mission Brief in run_criteria.
 * Handoff-ready for the Department Head (P1.2).
 * 
 * @param {number} runId The ID of the research run in research_runs table
 * @returns {{ success: boolean, run_id: number, brief?: object, version?: string, error?: string }}
 */
function parseRun(runId) {
  const t0 = Date.now();
  const startedAt = new Date().toISOString();
  const engine = getBrowserEngine();

  engine.log('info', `🔍 Parser: reading run #${runId}…`);

  const dbInstance = db.getDb();

  // 1. Fetch the run record
  const run = dbInstance.prepare('SELECT * FROM research_runs WHERE id = ?').get(runId);
  if (!run) {
    const errorMsg = `Run #${runId} not found in research_runs table.`;
    engine.log('error', `❌ Parser: ${errorMsg}`);
    return { success: false, error: errorMsg, run_id: runId };
  }

  // Update Agent #2 status to running
  try {
    dbInstance.prepare(`
      UPDATE agent_status 
      SET status = 'running', started_at = ?, last_error = NULL, updated_at = datetime('now')
      WHERE run_id = ? AND agent_number = 2
    `).run(startedAt, runId);
  } catch (err) {
    console.warn(`[criteriaParser] Failed to set agent_status to running: ${err.message}`);
  }

  // 2. Fetch associated countries
  const countryRows = dbInstance.prepare(`
    SELECT country_code, country_name, selection_type, potential_score 
    FROM run_countries 
    WHERE run_id = ? 
    ORDER BY id ASC
  `).all(runId);

  // 3. Fetch app settings for auto_approve policy at parse time
  let appSettings = {};
  try {
    appSettings = db.getSettings();
  } catch {
    appSettings = { auto_approve: 0 };
  }

  const isAutoApprove = run.auto_approve === 1 || appSettings.autoApprove === true || appSettings.auto_approve === 1;

  // 4. Parse business modes
  let parsedBusinessModes = [];
  if (Array.isArray(run.business_modes)) {
    parsedBusinessModes = run.business_modes;
  } else if (typeof run.business_modes === 'string') {
    try {
      parsedBusinessModes = JSON.parse(run.business_modes);
    } catch {
      parsedBusinessModes = [];
    }
  }

  // 5. Check if raw_input snapshot exists in run_criteria or reconstruct from run
  let rawInputSnapshot = null;
  const existingCriteria = dbInstance.prepare('SELECT * FROM run_criteria WHERE run_id = ?').get(runId);
  if (existingCriteria && existingCriteria.raw_input) {
    try {
      rawInputSnapshot = JSON.parse(existingCriteria.raw_input);
    } catch {
      rawInputSnapshot = null;
    }
  }

  if (!rawInputSnapshot) {
    rawInputSnapshot = {
      run_name: run.run_name,
      input_mode: run.input_mode,
      business_modes: parsedBusinessModes,
      niche_quantity: run.niche_quantity,
      own_niche_name: run.own_niche_name || null,
      domain: run.domain || null,
      competition_level: run.competition_level || 'any',
      country_codes: countryRows.map((c) => c.country_code),
      auto_approve: isAutoApprove,
    };
  }

  // ══════════════════════════════════════════════════════════
  // VALIDATION LOGIC
  // ══════════════════════════════════════════════════════════
  let validationError = null;

  // Rule A: Input Mode
  if (!VALID_INPUT_MODES.has(run.input_mode)) {
    validationError = `Invalid input_mode '${run.input_mode}'. Must be one of: 'discovery', 'own_niche', 'own_domain'.`;
  }

  // Rule B: Business Modes (at least 1, all valid)
  if (!validationError) {
    if (!Array.isArray(parsedBusinessModes) || parsedBusinessModes.length === 0) {
      validationError = 'business_modes is required and must contain at least 1 monetization model.';
    } else {
      for (const m of parsedBusinessModes) {
        if (!VALID_BUSINESS_MODES.has(m)) {
          validationError = `Invalid business mode '${m}'. Allowed modes: ${Array.from(VALID_BUSINESS_MODES).join(', ')}.`;
          break;
        }
      }
    }
  }

  // Rule C: Mode-specific quantities & parameters
  let effectiveQuantity = run.niche_quantity;
  let effectiveDomain = null;
  let effectiveOwnNiche = run.own_niche_name || null;

  if (!validationError) {
    if (run.input_mode === 'discovery') {
      const q = parseInt(run.niche_quantity, 10);
      if (isNaN(q) || q < 1) {
        validationError = 'niche_quantity is required for discovery mode and must be an integer >= 1.';
      } else {
        effectiveQuantity = q;
      }
      effectiveDomain = null;
      effectiveOwnNiche = null;
    } else if (run.input_mode === 'own_domain') {
      const q = parseInt(run.niche_quantity, 10);
      if (isNaN(q) || q < 1) {
        validationError = 'niche_quantity is required for own_domain mode and must be an integer >= 1.';
      } else {
        effectiveQuantity = q;
      }

      const cleanDom = cleanDomainInput(run.domain);
      if (!isValidDomain(cleanDom)) {
        validationError = `A valid domain name is required for own_domain mode. Received: '${run.domain || ''}'.`;
      } else {
        effectiveDomain = cleanDom;
      }
      effectiveOwnNiche = null;
    } else if (run.input_mode === 'own_niche') {
      // Force quantity = 1 for own_niche
      effectiveQuantity = 1;
      effectiveDomain = null;

      // Extract niche name from own_niche_name, criteria raw_input, or run_name
      let candidateNiche = run.own_niche_name;
      if (!candidateNiche && rawInputSnapshot) {
        candidateNiche = rawInputSnapshot.niche_name || rawInputSnapshot.own_niche_name;
      }
      if (!candidateNiche && run.run_name) {
        candidateNiche = run.run_name
          .replace(/^Validation:\s*/i, '')
          .replace(/^P0\.\d+\s*Test\s*Niche:\s*/i, '')
          .replace(/^Own\s*Niche:\s*/i, '')
          .trim();
      }

      if (!candidateNiche || candidateNiche.trim().length < 2) {
        validationError = 'A valid niche name is required for own_niche mode.';
      } else {
        effectiveOwnNiche = candidateNiche.trim();
      }
    }
  }

  // Rule D: Competition level
  let effectiveCompetition = run.competition_level || 'any';
  if (!VALID_COMPETITION_LEVELS.has(effectiveCompetition)) {
    effectiveCompetition = 'any';
  }

  // ══════════════════════════════════════════════════════════
  // IF VALIDATION FAILED
  // ══════════════════════════════════════════════════════════
  if (validationError) {
    const durationMs = Date.now() - t0;
    const endedAt = new Date().toISOString();

    engine.log('error', `❌ Parser: validation failed for Run #${runId} — ${validationError}`);

    // Update research_runs to failed status
    dbInstance.prepare(`
      UPDATE research_runs 
      SET status = 'failed', error_summary = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(validationError, runId);

    // Update Agent #2 status
    dbInstance.prepare(`
      UPDATE agent_status 
      SET status = 'failed', last_error = ?, output_summary = ?, finished_at = ?, updated_at = datetime('now')
      WHERE run_id = ? AND agent_number = 2
    `).run(
      validationError,
      `Validation failed: ${validationError}`,
      endedAt,
      runId
    );

    // Log timing
    try {
      db.insert('timing_logs', {
        run_id: runId,
        task_ref: `criteria_parser_run_${runId}`,
        agent_number: 2,
        operation: 'criteria_parse',
        started_at: startedAt,
        ended_at: endedAt,
        duration_ms: Math.max(1, durationMs),
        cache_hit: 0,
      });
    } catch {
      // ignore
    }

    return {
      success: false,
      run_id: runId,
      error: validationError,
    };
  }

  // ══════════════════════════════════════════════════════════
  // BUILD STRUCTURED MISSION BRIEF
  // ══════════════════════════════════════════════════════════
  const countriesMode = countryRows.length > 0 ? 'user_selected' : 'auto_potential';
  const countriesList = countryRows.map((c) => ({
    code: c.country_code,
    name: c.country_name,
  }));

  // Build mode directives map for selected business modes
  const modeDirectives = {};
  for (const mode of parsedBusinessModes) {
    if (BUSINESS_MODE_DIRECTIVES[mode]) {
      modeDirectives[mode] = BUSINESS_MODE_DIRECTIVES[mode];
    }
  }

  // Determine parser version (bump if re-parsing an existing parsed brief)
  let version = '1.0';
  if (existingCriteria && existingCriteria.parser_version && existingCriteria.parsed_brief) {
    const prevVer = parseFloat(existingCriteria.parser_version);
    if (!isNaN(prevVer)) {
      version = (prevVer + 0.1).toFixed(1);
    }
  }

  const parsedBrief = {
    brief_version: version,
    run_id: Number(runId),
    input_mode: run.input_mode,
    business_modes: parsedBusinessModes,
    niche_quantity: effectiveQuantity,
    own_niche_name: effectiveOwnNiche,
    domain: effectiveDomain,
    competition_level: effectiveCompetition,
    countries: {
      mode: countriesMode,
      list: countriesList,
      rule: 'If user_selected: research ONLY these. If auto_potential: Agent #10 selects all potential countries; EQUAL depth per country.',
    },
    approval_gate: {
      auto_approve: isAutoApprove,
      gate_location: 'after_discovery',
      rule: 'If auto_approve=true: gate skipped, full run in one click. If false: pause after discovery until user approves/edits niche list.',
    },
    mode_weights_hint: MODE_WEIGHTS_HINT,
    business_mode_directives: modeDirectives,
    agent_instructions: {
      niche_discovery: 'Find EXACTLY niche_quantity niches. No more, no less. In own_domain mode: ONLY niches that intelligently fit the domain, with fit-reasoning. In own_niche mode: research ONLY the user\'s niche (quantity=1).',
      country_potential: 'If countries.mode=auto_potential: select all potential countries yourself. Rule: low competition + no potential = REJECT.',
      all_agents: 'Read this brief. Follow it exactly. Depth per niche per country must be EQUAL and COMPLETE.',
    },
    parsed_at: new Date().toISOString(),
  };

  if (run.input_mode === 'own_domain' && effectiveDomain) {
    parsedBrief.domain_fit_directive = 'Every report section must reference how/why each niche fits this domain.';
  }

  // ══════════════════════════════════════════════════════════
  // PERSIST BRIEF & TRANSITION STATUS TO 'planning'
  // ══════════════════════════════════════════════════════════
  const durationMs = Date.now() - t0;
  const endedAt = new Date().toISOString();

  const persistTx = dbInstance.transaction(() => {
    // 1. Insert or Update run_criteria
    if (existingCriteria) {
      dbInstance.prepare(`
        UPDATE run_criteria 
        SET raw_input = ?, parsed_brief = ?, parser_version = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        JSON.stringify(rawInputSnapshot),
        JSON.stringify(parsedBrief),
        version,
        existingCriteria.id
      );
    } else {
      dbInstance.prepare(`
        INSERT INTO run_criteria (run_id, raw_input, parsed_brief, parser_version)
        VALUES (?, ?, ?, ?)
      `).run(
        runId,
        JSON.stringify(rawInputSnapshot),
        JSON.stringify(parsedBrief),
        version
      );
    }

    // 2. Update research_runs: pending -> planning (clear errors)
    dbInstance.prepare(`
      UPDATE research_runs 
      SET status = 'planning',
          error_summary = NULL,
          niche_quantity = ?,
          domain = ?,
          own_niche_name = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      effectiveQuantity,
      effectiveDomain,
      effectiveOwnNiche,
      runId
    );

    // 3. Update Agent #2 status in agent_status
    const countriesSummary = countriesMode === 'auto_potential'
      ? 'auto-potential countries'
      : `${countriesList.length} countries (${countriesList.map((c) => c.code).join(',')})`;

    const summaryText = `Brief v${version} created — ${run.input_mode}, ${parsedBusinessModes.length} modes, ${effectiveQuantity} niches, ${countriesSummary}`;

    dbInstance.prepare(`
      UPDATE agent_status 
      SET status = 'done',
          last_error = NULL,
          output_summary = ?,
          output_payload = ?,
          finished_at = ?,
          updated_at = datetime('now')
      WHERE run_id = ? AND agent_number = 2
    `).run(
      summaryText,
      JSON.stringify(parsedBrief),
      endedAt,
      runId
    );

    // 4. Log to timing_logs
    try {
      db.insert('timing_logs', {
        run_id: runId,
        task_ref: `criteria_parser_run_${runId}`,
        agent_number: 2,
        operation: 'criteria_parse',
        started_at: startedAt,
        ended_at: endedAt,
        duration_ms: Math.max(1, durationMs),
        cache_hit: 0,
      });
    } catch (err) {
      console.warn(`[criteriaParser] Failed to log timing: ${err.message}`);
    }
  });

  persistTx();

  // Automatically review with Quality Supervisor if not already reviewed for this run
  try {
    const existingRev = dbInstance.prepare('SELECT id FROM quality_reviews WHERE run_id = ? AND agent_number = 2').get(runId);
    if (!existingRev) {
      const qualitySupervisor = require('./qualitySupervisor');
      qualitySupervisor.reviewOutput({
        runId: Number(runId),
        agentNumber: 2,
        output: parsedBrief,
        context: { runId: Number(runId), brief: parsedBrief },
        reviewRound: 1,
        engine,
      });
    }
  } catch (qsErr) {
    console.warn(`[criteriaParser] QS auto-review warning: ${qsErr.message}`);
  }

  engine.log('info', `✅ Parser: brief created for Run #${runId} (${effectiveQuantity} niches, ${countriesMode === 'auto_potential' ? 'auto countries' : `${countriesList.length} countries`})`);

  return {
    success: true,
    run_id: Number(runId),
    version,
    brief: parsedBrief,
  };
}

module.exports = {
  parseRun,
  cleanDomainInput,
  isValidDomain,
};
