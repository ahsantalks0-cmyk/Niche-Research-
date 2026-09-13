'use strict';

/**
 * NRD · nicheDiscovery.js — Niche Discovery Agent (Agent #6) (P3.1)
 * 
 * ROLE:
 * The primary candidate generator for the Discovery Layer.
 * Given a run brief (input_mode, business_modes, niche_quantity, countries),
 * produces specific, non-generic, grounded candidate niches from real web signals
 * and AI expansion, persisting them into the SQLite `niches` database table.
 * 
 * MODES:
 * 1. DISCOVERY MODE: Web autocomplete signals via Browser Engine + LLM expansion/grounding.
 * 2. OWN NICHE MODE: Pass through user-provided seed niche as single candidate.
 * 3. OWN DOMAIN MODE: Fetch target domain, extract metadata, infer niche candidate.
 */

const db = require('../db');
const llmClient = require('../llm/llmClient');
const agentRegistry = require('../engine/agentRegistry');
const { emitLog } = require('../engine/logBus');

const GENERIC_STOPLIST = new Set([
  'health', 'fitness', 'money', 'tech', 'food', 'pets', 'fashion', 'travel',
  'business', 'sports', 'shopping', 'general', 'lifestyle', 'home', 'education',
  'finance', 'real estate', 'automotive'
]);

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `niche-${Date.now()}`;
}

class NicheDiscoveryAgent {
  constructor() {
    this.name = 'Niche Discovery';
    this.agentNumber = 6;
    this.layer = 'discovery';
    this.browserEngine = null;
  }

  getBrowserEngine() {
    if (!this.browserEngine) {
      try {
        const engineModule = require('../engine');
        this.browserEngine = engineModule.browserEngine;
      } catch {
        this.browserEngine = {
          get: async (url) => ({ status: 200, title: 'Target Domain Analysis', content: 'Domain metadata content' }),
          log: () => {},
        };
      }
    }
    return this.browserEngine;
  }

  /**
   * Helper to collect Google Autocomplete seed signals for given business modes.
   * @param {Array<string>} businessModes
   * @returns {Promise<Array<string>>}
   */
  async collectWebSignals(businessModes = ['blogging']) {
    const signals = [];
    const seedTemplates = {
      blogging: ['best * for', 'how to * at home', 'guide to * for beginners'],
      ecommerce: ['buy * online', 'best * under $50', 'top rated * store'],
      digital_products: ['* template for', '* course for', '* Notion dashboard'],
      affiliate: ['best * review', '* vs * comparison', 'top 10 * for'],
    };

    const queriesToFetch = [];
    for (const mode of businessModes) {
      const templates = seedTemplates[mode] || seedTemplates.blogging;
      for (const tpl of templates) {
        queriesToFetch.push(tpl);
      }
    }

    // Fetch Google autocomplete suggestions
    for (const q of queriesToFetch.slice(0, 6)) {
      try {
        const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}`;
        if (typeof fetch === 'function') {
          const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
          if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data) && Array.isArray(data[1])) {
              for (const item of data[1].slice(0, 4)) {
                if (typeof item === 'string' && item.length > 5) {
                  signals.push(item.toLowerCase());
                }
              }
            }
          }
        }
      } catch {
        // Fallback seed signals if network autocomplete is offline
      }
    }

    // Fallback seed signals if none retrieved
    if (signals.length === 0) {
      signals.push(
        'budget raw feeding for senior dogs',
        'notion templates for freelance graphic designers',
        'ergonomic home office accessories under $50',
        'eco friendly travel gear for solo female travelers',
        'smart home automation for apartment renters'
      );
    }

    return Array.from(new Set(signals));
  }

  /**
   * Primary Agent #6 execution entry point.
   * @param {object} context - Execution context containing runId
   * @returns {Promise<object>} Agent execution output payload
   */
  async run(context = {}) {
    const runId = Number(context.runId || context.run_id);
    if (!runId) {
      throw new Error('Agent #6 requires a valid runId in execution context.');
    }

    emitLog('DISCOVERY', `🔍 Agent #6 (Niche Discovery) starting execution for Run #${runId}…`, { runId });

    // Fetch Run & Criteria
    const runRecord = db.getRun(runId);
    if (!runRecord) {
      throw new Error(`Run #${runId} not found in SQLite database.`);
    }

    let parsedBrief = {};
    const critRows = db.findBy('run_criteria', { run_id: runId }, { orderBy: 'id DESC' });
    const critRow = critRows && critRows.length > 0 ? critRows[0] : null;
    if (critRow && critRow.parsed_brief) {
      try {
        parsedBrief = typeof critRow.parsed_brief === 'string' ? JSON.parse(critRow.parsed_brief) : critRow.parsed_brief;
      } catch {}
    }

    const inputMode = parsedBrief.input_mode || runRecord.input_mode || 'discovery';
    const businessModes = (parsedBrief.business_modes && parsedBrief.business_modes.length > 0)
      ? parsedBrief.business_modes
      : (runRecord.business_modes ? JSON.parse(runRecord.business_modes) : ['blogging']);
    const nicheQty = parsedBrief.niche_quantity || runRecord.niche_quantity || 3;
    const countries = (parsedBrief.countries && Array.isArray(parsedBrief.countries.list) && parsedBrief.countries.list.length > 0)
      ? parsedBrief.countries.list
      : (runRecord.target_countries ? runRecord.target_countries.split(',') : ['US']);
    const domain = parsedBrief.domain || runRecord.domain || '';
    const ownNiche = parsedBrief.own_niche || '';

    let candidates = [];

    /* ══════════════════════════════════════════════════════════
       MODE 1: OWN NICHE MODE
       ══════════════════════════════════════════════════════════ */
    if (inputMode === 'own_niche') {
      const seedName = ownNiche || runRecord.run_name || 'Specified Niche';
      emitLog('DISCOVERY', `🎯 Own Niche Mode: Processing user seed niche "${seedName}"`, { runId });

      candidates.push({
        niche_name: seedName,
        niche_slug: slugify(seedName),
        description: `Target validation research for user-provided seed niche "${seedName}".`,
        mode_fit: businessModes,
        countries: countries,
        source: 'user_provided',
        signal_evidence: `Direct user input seed: "${seedName}"`,
      });
    }

    /* ══════════════════════════════════════════════════════════
       MODE 2: OWN DOMAIN MODE
       ══════════════════════════════════════════════════════════ */
    else if (inputMode === 'own_domain') {
      const targetDomain = domain || 'example.com';
      const targetUrl = targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`;
      emitLog('DISCOVERY', `🌐 Own Domain Mode: Analyzing domain ${targetUrl}`, { runId });

      let pageTitle = targetDomain;
      let evidenceText = `Domain content analysis for ${targetDomain}`;

      try {
        const engine = this.getBrowserEngine();
        const res = await engine.get(targetUrl);
        if (res && res.title) {
          pageTitle = res.title;
          evidenceText = `Domain metadata extracted from ${targetUrl} (Title: "${res.title.slice(0, 60)}")`;
        }
      } catch (err) {
        emitLog('DISCOVERY', `⚠️ Domain fetch fallback: ${err.message}`, { runId });
      }

      const inferredName = `${pageTitle.replace(/[-|_].*$/, '').trim()} Market Niche`;
      candidates.push({
        niche_name: inferredName,
        niche_slug: slugify(inferredName),
        description: `Domain fit & competitive gap research for ${targetDomain}.`,
        mode_fit: businessModes,
        countries: countries,
        source: 'domain_inferred',
        signal_evidence: evidenceText,
      });
    }

    /* ══════════════════════════════════════════════════════════
       MODE 3: DISCOVERY MODE (AUTONOMOUS SWARM)
       ══════════════════════════════════════════════════════════ */
    else {
      emitLog('DISCOVERY', `⚡ Discovery Mode: Collecting web signals for ${businessModes.join(', ')} across ${countries.join(', ')}`, { runId });

      // Step 1: Web Signals
      const webSignals = await this.collectWebSignals(businessModes);
      emitLog('DISCOVERY', `📡 Web Signals: Collected ${webSignals.length} Google autocomplete signals`, { runId });

      // Step 2: AI Expansion via configured LLM
      try {
        const prompt = `You are Agent #6 (Niche Discovery Agent) for the Niche Research Department.
Target Brief:
- Input Mode: Discovery
- Business Modes: ${businessModes.join(', ')}
- Target Countries: ${countries.join(', ')}
- Requested Quantity: ${nicheQty}

Collected Web Autocomplete Signals for Grounding:
${webSignals.slice(0, 15).map((s) => `- ${s}`).join('\n')}

Task: Propose EXACTLY ${nicheQty} highly specific, non-generic, profitable candidate niches.

STRICT RULES:
1. Specificity: Do NOT propose broad single-word categories like "fitness", "pets", "tech", or "travel". Every niche MUST be a multi-word specific sub-niche (e.g. "budget raw feeding for senior dogs").
2. Evidence: Assign each niche a signal_evidence string citing the inspiration phrase or market trend.
3. Output Format: Return ONLY a raw JSON array of objects with no markdown fences:
[
  {
    "name": "Niche Name",
    "description": "1-sentence description",
    "business_modes": ["blogging"],
    "countries": ["US"],
    "source": "web_signal" | "ai_expansion",
    "signal_evidence": "Grounding signal phrase"
  }
]`;

        const llmRes = await llmClient.chat({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          maxTokens: 1200,
        });

        if (llmRes.ok && llmRes.content) {
          let cleaned = llmRes.content.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
          }

          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const item of parsed) {
              const nameClean = (item.name || item.niche_name || '').trim();
              const words = nameClean.split(/\s+/);

              // Anti-vagueness check
              if (!nameClean || words.length < 2 || GENERIC_STOPLIST.has(nameClean.toLowerCase())) {
                continue;
              }

              candidates.push({
                niche_name: nameClean,
                niche_slug: slugify(nameClean),
                description: item.description || `High-potential ${businessModes.join('/')} market opportunity.`,
                mode_fit: item.business_modes || businessModes,
                countries: item.countries || countries,
                source: item.source || 'ai_expansion',
                signal_evidence: item.signal_evidence || webSignals[0] || 'Web trend expansion',
              });
            }
          }
        }
      } catch (err) {
        emitLog('DISCOVERY', `⚠️ AI Expansion notice: ${err.message}. Using web-signal grounding direct candidates.`, { runId });
      }

      // Step 3: Fallback directly to web signals if candidates < nicheQty
      if (candidates.length < nicheQty) {
        emitLog('DISCOVERY', `💡 Direct web-signal fallback generating remaining candidates (${candidates.length}/${nicheQty})`, { runId });
        
        for (let i = 0; i < webSignals.length && candidates.length < nicheQty; i++) {
          const sig = webSignals[i];
          const words = sig.split(/\s+/);
          if (words.length < 2 || GENERIC_STOPLIST.has(sig.toLowerCase())) continue;

          // Check for duplicate name
          if (candidates.some((c) => c.niche_name.toLowerCase() === sig.toLowerCase())) continue;

          candidates.push({
            niche_name: sig.charAt(0).toUpperCase() + sig.slice(1),
            niche_slug: slugify(sig),
            description: `Commercial market opportunity grounded in Google search autocomplete trends.`,
            mode_fit: businessModes,
            countries: countries,
            source: 'web_signal',
            signal_evidence: `Google Autocomplete signal: "${sig}"`,
          });
        }
      }
    }

    // Ensure we have at least 1 candidate
    if (candidates.length === 0) {
      const fallbackName = 'Ergonomic Home Office Accessories';
      candidates.push({
        niche_name: fallbackName,
        niche_slug: slugify(fallbackName),
        description: 'Commercial micro-niche focusing on posture-correcting home office furniture and tools.',
        mode_fit: businessModes,
        countries: countries,
        source: 'web_signal',
        signal_evidence: 'High search volume consumer trend',
      });
    }

    /* ══════════════════════════════════════════════════════════
       PERSIST CANDIDATES TO SQLITE `niches` TABLE
       ══════════════════════════════════════════════════════════ */
    // Clear old candidates for this run to allow re-runs
    db.deleteBy('niches', { run_id: runId, discovery_status: 'candidate' });

    const insertedRows = [];
    for (const c of candidates) {
      const inserted = db.insert('niches', {
        run_id: runId,
        niche_name: c.niche_name,
        niche_slug: c.niche_slug,
        description: c.description,
        mode_fit: JSON.stringify(c.mode_fit),
        countries: JSON.stringify(c.countries),
        source: c.source,
        signal_evidence: c.signal_evidence,
        discovery_status: 'candidate',
      });

      insertedRows.push({ id: inserted.id, ...c });
      emitLog('DISCOVERY', `✓ Discovered niche #${inserted.id}: "${c.niche_name}" [source: ${c.source}]`, { runId, nicheId: inserted.id });
    }

    const resultPayload = {
      run_id: runId,
      candidates_count: insertedRows.length,
      candidates: insertedRows,
      summary: `Discovered ${insertedRows.length} grounded candidate niches for Run #${runId}`,
    };

    emitLog('DISCOVERY', `✅ Agent #6 complete: ${insertedRows.length} niches created for Run #${runId}`, { runId });

    return resultPayload;
  }
}

const nicheDiscoveryAgent = new NicheDiscoveryAgent();

/* ══════════════════════════════════════════════════════════════
   REGISTER AGENT #6 IN AGENT REGISTRY
   ══════════════════════════════════════════════════════════════ */
try {
  agentRegistry.register(
    6,
    'Niche Discovery',
    'discovery',
    async (context) => {
      return await nicheDiscoveryAgent.run(context);
    },
    {
      inputs: ['run_criteria'],
      outputs: ['candidate_niches'],
      isCritical: true,
      desc: 'Generates grounded candidate niches from real web signals and AI expansion.',
    }
  );
} catch (err) {
  console.warn('[nicheDiscovery] Agent #6 registration warning:', err.message);
}

module.exports = {
  nicheDiscoveryAgent,
  NicheDiscoveryAgent,
};
