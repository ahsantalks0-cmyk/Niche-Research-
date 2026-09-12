'use strict';

/**
 * NRD · agentRegistry.js — Central Agent Registry for 35 Specialists.
 * 
 * DESIGN PRINCIPLE:
 * Single Source of Truth for all 35 agents across 5 architectural layers:
 * 1. Control Layer (Agents 1–5)
 * 2. Discovery Layer (Agents 6–10)
 * 3. Deep Research Layer (Agents 11–26)
 * 4. Intelligence Layer (Agents 27–30)
 * 5. QA & Reporting Layer (Agents 31–35)
 * 
 * Future prompts (P1.3–P6.4) register new agents simply by calling `register()`.
 * Pending (unimplemented) agents are automatically listed as placeholders so the
 * Chain Engine can build plans and execute end-to-end today without hardcoded checks.
 */

const ALL_35_AGENTS = [
  // 1. Control Layer
  { number: 1, name: 'Department Head', layer: 'control', desc: 'Plan maker & master orchestrator of all 35 agents' },
  { number: 2, name: 'Criteria Parser', layer: 'control', desc: 'Validates & parses commission inputs into mission briefs' },
  { number: 3, name: 'Quality Supervisor', layer: 'qa_reporting', desc: 'Shadow auditor running across all phases with veto power' },
  { number: 4, name: 'Scheduler Agent', layer: 'control', desc: 'Cron & recurring automated niche commission triggers' },
  { number: 5, name: 'Jarvis Gateway', layer: 'control', desc: 'External CLI, API & webhook trigger intake coordinator' },

  // 2. Discovery Layer
  { number: 6, name: 'Niche Discovery', layer: 'discovery', desc: 'Surfaces seed candidate niches matching criteria' },
  { number: 7, name: 'Trend & Demand Signal', layer: 'discovery', desc: 'Evaluates 5-year macro/micro search trends & volatility' },
  { number: 8, name: 'Quick Competition Screener', layer: 'discovery', desc: 'Fast initial domain authority & SERP difficulty scan' },
  { number: 9, name: 'Duplicate & History Check', layer: 'discovery', desc: 'Deduplicates against historical database entries' },
  { number: 10, name: 'Country Potential Intelligence', layer: 'discovery', desc: 'Autonomous market selection when countries are auto-selected' },

  // 3. Deep Research Layer (Per approved niche × Per country)
  { number: 11, name: 'Keyword Research', layer: 'deep_research', desc: 'Deep keyword cluster extraction, intent & volume metrics' },
  { number: 12, name: 'SERP Analysis', layer: 'deep_research', desc: 'Top 10 organic SERP page structure & domain authority audit' },
  { number: 13, name: 'Competitor Deep-Dive', layer: 'deep_research', desc: 'Deconstructs top 3 dominant niche competitors' },
  { number: 14, name: 'Content Gap Analysis', layer: 'deep_research', desc: 'Uncovers low-competition informational keyword gaps' },
  { number: 15, name: 'Unmet Search Intent', layer: 'deep_research', desc: 'Extracts unanswered forum questions & Reddit/Quora voids' },
  { number: 16, name: 'Social Media Competition', layer: 'deep_research', desc: 'TikTok, Instagram, YouTube & Pinterest brand density audit' },
  { number: 17, name: 'Paid Ads Competition', layer: 'deep_research', desc: 'Google Ads commercial intent & advertiser CPC saturation' },
  { number: 18, name: 'Monetization & Digital Product', layer: 'deep_research', desc: 'Analyzes digital asset & course pricing viability' },
  { number: 19, name: 'E-commerce Product Research', layer: 'deep_research', desc: 'Physical product margins, sourcing & shipping feasibility' },
  { number: 20, name: 'Digital Product List', layer: 'deep_research', desc: 'Creates itemized digital product roadmap & templates' },
  { number: 21, name: 'E-commerce Product List', layer: 'deep_research', desc: 'Produces physical product catalog & launch sequence' },
  { number: 22, name: 'Affiliate Program Research', layer: 'deep_research', desc: 'Identifies high-ticket affiliate networks & payout rates' },
  { number: 23, name: 'Ad Revenue & RPM', layer: 'deep_research', desc: 'Forecasts display ad network RPMs (Mediavine/Raptive/AdSense)' },
  { number: 24, name: 'Audience & Persona', layer: 'deep_research', desc: 'Constructs demographic profile, pain points & buyer persona' },
  { number: 25, name: 'Country Localization', layer: 'deep_research', desc: 'Local cultural nuances, payment platforms & regulations' },
  { number: 26, name: 'Domain & Brand Availability', layer: 'deep_research', desc: 'Domain name suggestions, TLD availability & brand fit analysis' },

  // 4. Intelligence Layer
  { number: 27, name: 'Country Benchmarking', layer: 'intelligence', desc: 'Comparative matrix ranking niche viability across countries' },
  { number: 28, name: 'Opportunity Scoring', layer: 'intelligence', desc: 'Calculates multi-factor Opportunity Score (0–100)' },
  { number: 29, name: 'Final Verdict', layer: 'intelligence', desc: 'Issues definitive GO / NO-GO verdict with clear rationale' },
  { number: 30, name: 'Risk & Compliance', layer: 'intelligence', desc: 'Evaluates YMYL, legal, copyright, and platform risk factors' },

  // 5. QA & Reporting Layer
  { number: 31, name: 'Quality Supervisor (Audit)', layer: 'qa_reporting', desc: 'Enforces strict data completeness & depth contracts' },
  { number: 32, name: 'QA & Validation', layer: 'qa_reporting', desc: 'Verifies calculation consistency & data integrity' },
  { number: 33, name: 'Report Specialist', layer: 'qa_reporting', desc: 'Compiles rich multi-tab interactive dossier & PDF export' },
  { number: 34, name: 'SEO Department Handoff', layer: 'qa_reporting', desc: 'Generates structured data payload for SEO content engines' },
  { number: 35, name: 'Re-Research Manager', layer: 'qa_reporting', desc: 'Schedules periodic automated re-validation sweeps' },
];

/**
 * In-memory map of registered executable agents.
 * @type {Map<number, { number: number, name: string, layer: string, handler: Function, meta: object }>}
 */
const registry = new Map();

/**
 * Registers an agent implementation into the registry.
 * 
 * @param {number} agentNumber The official agent number (1–35)
 * @param {string} name Standardized agent name
 * @param {string} layer Architectural layer
 * @param {Function} handler Function(context) -> Promise<object> | object
 * @param {object} [meta={}] Additional metadata (inputs, outputs, criticality)
 */
function register(agentNumber, name, layer, handler, meta = {}) {
  if (typeof agentNumber !== 'number' || agentNumber < 1 || agentNumber > 36) {
    throw new Error(`Invalid agentNumber ${agentNumber}. Must be integer 1–35.`);
  }
  if (typeof handler !== 'function') {
    throw new Error(`Handler for agent #${agentNumber} (${name}) must be a function.`);
  }

  registry.set(agentNumber, {
    number: agentNumber,
    name,
    layer,
    handler,
    meta: {
      inputs: meta.inputs || [],
      outputs: meta.outputs || [],
      isCritical: meta.isCritical !== undefined ? meta.isCritical : (agentNumber <= 10),
      ...meta,
    },
  });
}

/**
 * Retrieves a registered agent definition.
 * @param {number} agentNumber
 * @returns {object | null}
 */
function get(agentNumber) {
  const num = Number(agentNumber);
  const isReg = registry.has(num);
  const regItem = registry.get(num);
  const spec = ALL_35_AGENTS.find((a) => a.number === num);

  if (!spec && !regItem) return null;

  return {
    number: num,
    name: regItem ? regItem.name : (spec ? spec.name : `Agent #${num}`),
    layer: regItem ? regItem.layer : (spec ? spec.layer : 'unknown'),
    desc: spec ? spec.desc : '',
    status: isReg ? 'registered' : 'pending',
    isRegistered: isReg,
    handler: regItem ? regItem.handler : null,
    meta: regItem ? regItem.meta : {},
  };
}

/**
 * Lists only actively registered agents.
 * @returns {Array<object>}
 */
function listRegistered() {
  return Array.from(registry.values());
}

/**
 * Checks if an agent has an active registered implementation.
 * @param {number} agentNumber
 * @returns {boolean}
 */
function isRegistered(agentNumber) {
  return registry.has(Number(agentNumber));
}

/**
 * Returns all 35 agents with their current status ('registered' | 'pending').
 * @returns {Array<{ number: number, name: string, layer: string, desc: string, status: 'registered' | 'pending' }>}
 */
function listAll() {
  return ALL_35_AGENTS.map((spec) => {
    const isReg = registry.has(spec.number);
    const regItem = registry.get(spec.number);
    return {
      number: spec.number,
      name: regItem ? regItem.name : spec.name,
      layer: regItem ? regItem.layer : spec.layer,
      desc: spec.desc,
      status: isReg ? 'registered' : 'pending',
      meta: regItem ? regItem.meta : {},
    };
  });
}

/**
 * Clears the registry (useful for testing).
 */
function clearRegistry() {
  registry.clear();
}

module.exports = {
  register,
  get,
  isRegistered,
  listAll,
  listRegistered,
  clearRegistry,
  ALL_35_AGENTS,
};
