'use strict';

/**
 * NRD · qualitySupervisor.js — Agent #3: Quality Supervisor Agent (P1.3)
 * 
 * THE SHADOW INSPECTOR OF THE DEPARTMENT.
 * Reviews the output of every agent across all phases and enforces:
 * 1. DEPTH IS SACRED: Never approves shallow/incomplete work to keep chain moving.
 * 2. ANTI-VACUOUS ENFORCEMENT: Missing data = FAIL. An empty result is never a pass.
 * 3. TWO-STAGE REVIEW:
 *    - Stage 1: Deterministic rules (R1 Non-empty, R2 Schema, R3 Brief, R4 Depth, R5 No-placeholder) in ms.
 *    - Stage 2: Gemini semantic review for analytical depth (skips gracefully if no key).
 * 4. EXTENSIBLE RULE REGISTRY: `registerQualityRules(agentNumber, rulesSpec)` for future agents.
 */

const db = require('../db');
const agentRegistry = require('../engine/agentRegistry');
const llmClient = require('../llm/llmClient');

/**
 * In-memory registry for per-agent quality rules.
 * @type {Map<number, { requiredFields?: Array<string>, depthMarkers?: object, customCheck?: Function }>}
 */
const agentRulesRegistry = new Map();

/**
 * REGISTRATION API FOR FUTURE AGENTS (P3.1 onward)
 * 
 * Every agent can register its required schema fields, depth markers, and custom validation function.
 * 
 * @param {number} agentNumber Official agent number (1–35)
 * @param {object} rulesSpec
 * @param {Array<string>} [rulesSpec.requiredFields] Field paths required in agent's output
 * @param {object} [rulesSpec.depthMarkers] Key/value minimums (e.g. { minCompetitors: 5 })
 * @param {Function} [rulesSpec.customCheck] Function(output, context) -> { passed: boolean, failedRules: Array, feedback: string }
 */
function registerQualityRules(agentNumber, rulesSpec = {}) {
  if (typeof agentNumber !== 'number' || agentNumber < 1 || agentNumber > 35) {
    throw new Error(`Invalid agentNumber ${agentNumber} for Quality Rule registration.`);
  }

  agentRulesRegistry.set(agentNumber, {
    requiredFields: rulesSpec.requiredFields || [],
    depthMarkers: rulesSpec.depthMarkers || {},
    customCheck: typeof rulesSpec.customCheck === 'function' ? rulesSpec.customCheck : null,
  });
}

/* ══════════════════════════════════════════════════════════════
   PRE-REGISTERED RULES FOR EXISTING AGENTS
   ══════════════════════════════════════════════════════════════ */

// Agent #2: Criteria Parser Agent
registerQualityRules(2, {
  requiredFields: [
    'brief_version',
    'input_mode',
    'business_modes',
    'niche_quantity',
    'countries',
    'approval_gate',
    'agent_instructions',
  ],
  customCheck: (rawOutput, context) => {
    const failedRules = [];
    const output = rawOutput.parsed_brief || rawOutput.brief || rawOutput;

    if (!output.niche_quantity || output.niche_quantity < 1) {
      failedRules.push({
        rule: 'R3_BRIEF_COMPLIANCE',
        expected: 'niche_quantity >= 1',
        actual: String(output.niche_quantity),
      });
    }

    if (!Array.isArray(output.business_modes) || output.business_modes.length === 0) {
      failedRules.push({
        rule: 'R2_SCHEMA_COMPLETENESS',
        expected: 'non-empty business_modes array',
        actual: JSON.stringify(output.business_modes),
      });
    }

    if (output.countries && output.countries.mode === 'user_selected') {
      const expectedList = context.run?.countries_count || context.expectedCountryCount || null;
      if (expectedList && Array.isArray(output.countries.list) && output.countries.list.length !== expectedList) {
        failedRules.push({
          rule: 'R3_BRIEF_COMPLIANCE',
          expected: `${expectedList} user-selected countries`,
          actual: `${output.countries.list.length} countries covered`,
        });
      }
    }

    return {
      passed: failedRules.length === 0,
      failedRules,
      feedback: failedRules.map((f) => `${f.rule}: expected ${f.expected}, got ${f.actual}`).join('; '),
    };
  },
});

// Agent #1: Department Head Agent
registerQualityRules(1, {
  requiredFields: ['phases', 'agent_nodes', 'estimated_scope'],
  customCheck: (rawOutput, context) => {
    const failedRules = [];
    const output = rawOutput.execution_plan || rawOutput.dh_execution_plan || rawOutput;

    const expectedPhases = ['discovery', 'deep_research', 'scoring', 'qa_reporting'];
    const presentPhases = (output.phases || []).map((p) => p.phase);
    const missingPhases = expectedPhases.filter((p) => !presentPhases.includes(p));

    if (missingPhases.length > 0) {
      failedRules.push({
        rule: 'R2_SCHEMA_COMPLETENESS',
        expected: 'all core phases present',
        actual: `missing: ${missingPhases.join(', ')}`,
      });
    }

    let agentNodes = output.agent_nodes;
    if (!agentNodes && Array.isArray(output.phases)) {
      agentNodes = output.phases.flatMap((p) => p.agents || []);
    }

    if (Array.isArray(agentNodes) && agentNodes.length > 0) {
      const invalidNodes = agentNodes.filter((node) => node && !Array.isArray(node.depends_on));
      if (invalidNodes.length > 0) {
        failedRules.push({
          rule: 'R2_SCHEMA_COMPLETENESS',
          expected: 'all agent_nodes to contain depends_on array',
          actual: `${invalidNodes.length} nodes missing depends_on`,
        });
      }
    } else {
      failedRules.push({
        rule: 'R1_NON_EMPTY',
        expected: 'non-empty agent_nodes array',
        actual: 'empty or missing agent_nodes',
      });
    }

    return {
      passed: failedRules.length === 0,
      failedRules,
      feedback: failedRules.map((f) => `${f.rule}: expected ${f.expected}, got ${f.actual}`).join('; '),
    };
  },
});

/* ══════════════════════════════════════════════════════════════
   GENERIC QUALITY RULE CHECKERS (STAGE 1)
   ══════════════════════════════════════════════════════════════ */

/**
 * Checks if value is recursively empty (Anti-Vacuous rule R1).
 * @param {any} value
 * @returns {boolean}
 */
function isVacuous(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && !(value instanceof Date) && Object.keys(value).length === 0) return true;
  return false;
}

/**
 * Traverses an object using a dot-separated field path (e.g. "countries.list").
 * @param {object} obj
 * @param {string} fieldPath
 * @returns {any}
 */
function getNestedValue(obj, fieldPath) {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = fieldPath.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[p];
  }
  return curr;
}

/**
 * Scans object recursively for placeholder strings (R5 NO-PLACEHOLDER).
 * @param {any} value
 * @returns {string | null} Returns found placeholder string or null
 */
function findPlaceholderText(value) {
  const placeholders = ['TODO', 'LOREM IPSUM', 'WILL BE IMPLEMENTED', 'PLACEHOLDER'];
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    for (const ph of placeholders) {
      if (upper.includes(ph)) return value;
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPlaceholderText(item);
      if (found) return found;
    }
  } else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const val of Object.values(value)) {
      const found = findPlaceholderText(val);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Runs Stage 1 Deterministic Checks.
 * @param {number} agentNumber
 * @param {any} output
 * @param {object} context
 * @returns {{ passed: boolean, failedRules: Array<{ rule: string, expected: string, actual: string }>, feedback: string }}
 */
function runStage1Checks(agentNumber, output, context = {}) {
  const failedRules = [];

  // Unwrap standardized agent output wrappers (e.g. parsed_brief, brief, or execution_plan)
  const targetObj = (output && typeof output === 'object')
    ? (output.parsed_brief || output.brief || output.execution_plan || output.dh_execution_plan || output)
    : output;

  // R1 NON-EMPTY (Anti-Vacuous Rule — missing data = FAIL, never pass)
  if (isVacuous(output) || isVacuous(targetObj)) {
    failedRules.push({
      rule: 'R1_NON_EMPTY',
      expected: 'non-empty agent output object',
      actual: output === null ? 'null' : output === undefined ? 'undefined' : JSON.stringify(output),
    });
    return {
      passed: false,
      failedRules,
      feedback: 'R1_NON_EMPTY: agent output is missing or empty (vacuous pass forbidden)',
    };
  }

  // R5 NO-PLACEHOLDER check
  const placeholderVal = findPlaceholderText(output);
  if (placeholderVal) {
    failedRules.push({
      rule: 'R5_NO_PLACEHOLDER_TEXT',
      expected: 'clean production content without placeholder text',
      actual: `found placeholder: "${placeholderVal.slice(0, 50)}"`,
    });
  }

  // Retrieve agent specific rules
  const registered = agentRulesRegistry.get(agentNumber);
  if (registered) {
    // R2 SCHEMA COMPLETENESS
    if (Array.isArray(registered.requiredFields)) {
      for (const field of registered.requiredFields) {
        const val = getNestedValue(targetObj, field) ?? getNestedValue(output, field);
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          failedRules.push({
            rule: 'R2_SCHEMA_COMPLETENESS',
            expected: `required field '${field}' present`,
            actual: `missing or empty field '${field}'`,
          });
        }
      }
    }

    // R4 DEPTH MARKERS
    if (registered.depthMarkers && typeof registered.depthMarkers === 'object') {
      for (const [marker, minVal] of Object.entries(registered.depthMarkers)) {
        const actualVal = getNestedValue(targetObj, marker) ?? getNestedValue(output, marker);
        const actualCount = Array.isArray(actualVal) ? actualVal.length : Number(actualVal) || 0;
        if (actualCount < minVal) {
          failedRules.push({
            rule: 'R4_DEPTH_MARKERS',
            expected: `depth minimum '${marker}' >= ${minVal}`,
            actual: `expected ${minVal}, got ${actualCount}`,
          });
        }
      }
    }

    // Custom check function
    if (registered.customCheck) {
      try {
        const customRes = registered.customCheck(output, context);
        if (customRes && !customRes.passed && Array.isArray(customRes.failedRules)) {
          for (const fr of customRes.failedRules) {
            failedRules.push(typeof fr === 'string' ? { rule: fr, expected: 'custom check pass', actual: customRes.feedback || fr } : fr);
          }
        }
      } catch (err) {
        failedRules.push({
          rule: 'CUSTOM_CHECK_ERROR',
          expected: 'custom validation to execute cleanly',
          actual: err.message,
        });
      }
    }
  }

  // R3 BRIEF COMPLIANCE (Generic brief compliance check if context has brief)
  if (context.brief) {
    const brief = context.brief;
    const expectedCountries = brief.target_countries || (Array.isArray(brief.countries) ? brief.countries : brief.countries?.list);
    if (Array.isArray(expectedCountries) && expectedCountries.length > 0) {
      const outputCountries = output.countries_covered || output.parsed_brief?.target_countries || output.parsed_brief?.countries || output.countries;
      if (Array.isArray(outputCountries)) {
        if (outputCountries.length < expectedCountries.length) {
          failedRules.push({
            rule: 'R3_BRIEF_COMPLIANCE',
            expected: `all ${expectedCountries.length} requested countries covered`,
            actual: `${outputCountries.length} covered`,
          });
        }
      }
    }
  }

  const passed = failedRules.length === 0;
  const feedback = passed
    ? 'All Stage 1 rules passed'
    : failedRules.map((f) => `${f.rule}: expected ${f.expected}, got ${f.actual}`).join('; ');

  return { passed, failedRules, feedback };
}

/* ══════════════════════════════════════════════════════════════
   STAGE 2 — GEMINI SEMANTIC REVIEW
   ══════════════════════════════════════════════════════════════ */

/**
 * Runs Stage 2 Gemini Semantic Review for analytical outputs.
 * Gracefully skips if Gemini API key is not configured or output is non-textual.
 * 
 * @param {number} agentNumber
 * @param {any} output
 * @param {object} context
 * @returns {Promise<{ verdict: 'pass' | 'send_back' | 'skip', feedback: string }>}
 */
async function runStage2GeminiReview(agentNumber, output, context = {}) {
  // Only run Stage 2 check if agent output has textual/analytical content
  const outputText = typeof output === 'string' ? output : JSON.stringify(output);
  if (!outputText || outputText.length < 100) {
    return { verdict: 'skip', feedback: 'Stage 2 skipped — structural output' };
  }

  try {
    const prompt = `You are the Quality Supervisor Agent reviewing an AI agent's analysis output for an automated market research application.
Output snippet to evaluate:
${outputText.slice(0, 1500)}

Evaluate: Is this analysis SPECIFIC and GROUNDED in data, or generic template fluff that could have been written without research?
Reply with EXACTLY ONE line starting with either "PASS: <reason>" or "SEND-BACK: <reason>".`;

    const res = await llmClient.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      maxTokens: 300,
    });

    if (!res.success) {
      return { verdict: 'skip', feedback: `Stage 2 skipped — ${res.error}` };
    }

    const replyText = (res.content || '').trim();

    if (replyText.startsWith('SEND-BACK')) {
      return {
        verdict: 'send_back',
        feedback: replyText.replace(/^SEND-BACK:\s*/, '') || 'LLM semantic review flagged shallow or generic output',
      };
    } else {
      return {
        verdict: 'pass',
        feedback: replyText.replace(/^PASS:\s*/, '') || 'LLM semantic review verified specific, grounded analysis',
      };
    }
  } catch (err) {
    return { verdict: 'skip', feedback: `Stage 2 skipped — API error: ${err.message}` };
  }
}

/* ══════════════════════════════════════════════════════════════
   MAIN QUALITY REVIEW ENTRYPOINT
   ══════════════════════════════════════════════════════════════ */

/**
 * Reviews agent output and enforces the Quality Supervisor contract.
 * 
 * @param {object} params
 * @param {number} params.runId
 * @param {number} params.agentNumber
 * @param {any} params.output
 * @param {object} [params.context={}]
 * @param {number} [params.reviewRound=1]
 * @param {object} [params.engine] Optional browser engine logger
 * @returns {Promise<{ verdict: 'pass' | 'send_back' | 'escalated', stage1Verdict: string, stage2Verdict: string, failedRules: Array, feedback: string }>}
 */
async function reviewOutput({ runId, agentNumber, output, context = {}, reviewRound = 1, engine = null }) {
  const t0 = Date.now();
  const runIdNum = Number(runId);
  const agentNum = Number(agentNumber);

  if (engine) {
    engine.log('info', `🛡️ QS: Reviewing Agent #${agentNum} output (Round ${reviewRound})…`);
  }

  // 1. Stage 1 Deterministic Checks
  const stage1Result = runStage1Checks(agentNum, output, context);
  const stage1Verdict = stage1Result.passed ? 'pass' : 'fail';

  let stage2Verdict = 'skip';
  let stage2Feedback = '';

  // 2. Stage 2 Gemini Semantic Review (only if Stage 1 passes)
  if (stage1Result.passed) {
    const stage2Result = await runStage2GeminiReview(agentNum, output, context);
    stage2Verdict = stage2Result.verdict;
    stage2Feedback = stage2Result.feedback;
  }

  // 3. Determine overall verdict
  let overallVerdict = 'pass';
  let combinedFeedback = stage1Result.feedback;

  if (stage1Verdict === 'fail') {
    overallVerdict = reviewRound > 2 ? 'escalated' : 'send_back';
  } else if (stage2Verdict === 'send_back') {
    overallVerdict = reviewRound > 2 ? 'escalated' : 'send_back';
    combinedFeedback = `Stage 2 Semantic Failure: ${stage2Feedback}`;
  } else if (stage2Verdict === 'pass' && stage2Feedback) {
    combinedFeedback = `${stage1Result.feedback} | ${stage2Feedback}`;
  }

  const durationMs = Date.now() - t0;
  const failedRuleCodes = stage1Result.failedRules.map((f) => (typeof f === 'string' ? f : f.rule));

  // 4. Save review in DB
  try {
    db.insertQualityReview({
      run_id: runIdNum,
      agent_number: agentNum,
      review_round: reviewRound,
      stage1_verdict: stage1Verdict,
      stage2_verdict: stage2Verdict,
      verdict: overallVerdict,
      failed_rules_json: failedRuleCodes,
      feedback_text: combinedFeedback,
      duration_ms: durationMs,
    });
  } catch (err) {
    if (engine) {
      engine.log('warn', `⚠️ QS: Failed to write quality_reviews DB row: ${err.message}`);
    }
  }

  // 5. Emit live logs & return
  if (engine) {
    if (overallVerdict === 'pass') {
      engine.log('info', `✅ QS: Agent #${agentNum} output PASSED (Stage 1: ${stage1Verdict}, Stage 2: ${stage2Verdict})`);
    } else if (overallVerdict === 'send_back') {
      engine.log('warn', `🔁 QS: Agent #${agentNum} SEND-BACK round ${reviewRound} — ${combinedFeedback}`);
    } else {
      engine.log('warn', `🚨 QS: Agent #${agentNum} ESCALATED after 2 send-backs — ${combinedFeedback}`);
    }
  }

  return {
    verdict: overallVerdict,
    stage1Verdict,
    stage2Verdict,
    failedRules: failedRuleCodes,
    failedRulesDetailed: stage1Result.failedRules,
    feedback: combinedFeedback,
    durationMs,
  };
}

/**
 * Quality Supervisor Agent #3 Handler (when invoked directly by Chain Engine)
 */
async function qualitySupervisorAgentHandler(context) {
  const runId = context.runId;
  const summary = db.getQualitySummary(runId);

  return {
    summary: `QS Summary: ${summary.totalPassed}/${summary.totalReviews} passed (${summary.passRatePct}%), ${summary.totalSendBacks} send-backs, ${summary.totalEscalated} escalations`,
    qualitySummary: summary,
  };
}

// Register Agent #3 (Quality Supervisor Agent) in Central Registry
agentRegistry.register(
  3,
  'Quality Supervisor Agent',
  'qa',
  qualitySupervisorAgentHandler,
  {
    inputs: ['all_agent_outputs'],
    outputs: ['quality_reviews'],
    isCritical: false,
    isShadow: true,
  }
);

module.exports = {
  registerQualityRules,
  runStage1Checks,
  runStage2GeminiReview,
  reviewOutput,
  qualitySupervisorAgentHandler,
  agentRulesRegistry,
};
