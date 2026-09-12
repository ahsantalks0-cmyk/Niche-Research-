'use strict';

/**
 * NRD · llmClient.js — Unified LLM Client Interface (P1.3c)
 * Standardized client routing across Google Gemini, OpenAI, Anthropic, and Groq.
 */

const db = require('../db');
const { getProvider, listProviders } = require('./llmProviders');

let activeRefreshInterval = null;

function getBrowserEngine() {
  try {
    const engine = require('../engine');
    return engine.browserEngine;
  } catch {
    return {
      log: (level, msg, meta) => console.log(`[NRD · ${meta?.category || level.toUpperCase()}] ${msg}`),
    };
  }
}

/**
 * Retrieves the currently active AI configuration from settings & environment.
 * @returns {{ providerId: string|null, modelId: string|null, apiKey: string|null }}
 */
function getActiveConfig() {
  let settings = {};
  try {
    settings = db.getSettings() || {};
  } catch {
    // DB fallback
  }

  const providerId = settings.ai_provider || 'gemini';
  const modelId = settings.ai_model || (providerId === 'gemini' ? 'gemini-2.5-flash' : null);
  
  // API key search order: per-provider setting -> environment -> gemini_api_key setting
  let apiKey = settings[`ai_key_${providerId}`] || null;
  if (!apiKey) {
    if (providerId === 'gemini') apiKey = process.env.GEMINI_API_KEY || settings.gemini_api_key || null;
    else if (providerId === 'openai') apiKey = process.env.OPENAI_API_KEY || null;
    else if (providerId === 'anthropic') apiKey = process.env.ANTHROPIC_API_KEY || null;
    else if (providerId === 'groq') apiKey = process.env.GROQ_API_KEY || null;
  }

  return { providerId, modelId, apiKey };
}

/**
 * Fetches live chat models from provider API and updates local DB cache.
 * @param {string} providerId
 * @param {string} apiKey
 * @returns {Promise<Array<{ id: string, name: string, isFreeTier: boolean, isPaid: boolean, tierLabel: string }>>}
 */
async function fetchModels(providerId, apiKey) {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const models = await provider.fetchModels(apiKey);

  // Update DB cache
  try {
    const settings = db.getSettings() || {};
    let cache = {};
    try {
      if (settings.models_cache_json) cache = JSON.parse(settings.models_cache_json);
    } catch {
      cache = {};
    }

    cache[providerId] = {
      fetchedAt: new Date().toISOString(),
      models,
    };

    db.saveSettings({
      models_cache_json: JSON.stringify(cache),
      models_cache_fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal cache write failure
  }

  return models;
}

/**
 * Runs a tiny validation call against a specific provider & model to verify credentials & billing.
 * @param {object} params
 * @param {string} params.providerId
 * @param {string} params.modelId
 * @param {string} params.apiKey
 * @returns {Promise<{ success: boolean, error?: string, isBillingError?: boolean }>}
 */
async function validateModel({ providerId, modelId, apiKey }) {
  if (!providerId || !modelId || !apiKey) {
    return { success: false, error: 'Provider, model, and API key are required' };
  }

  const provider = getProvider(providerId);
  if (!provider) {
    return { success: false, error: `Unknown provider '${providerId}'` };
  }

  try {
    const res = await chat({
      providerId,
      modelId,
      apiKey,
      messages: [{ role: 'user', content: 'Reply with: OK' }],
      maxTokens: 10,
    });

    if (res.success) {
      return { success: true };
    } else {
      const errStr = (res.error || '').toLowerCase();
      const isBilling = errStr.includes('402') ||
        errStr.includes('403') ||
        errStr.includes('insufficient_quota') ||
        errStr.includes('credit_balance') ||
        errStr.includes('billing') ||
        errStr.includes('quota');

      return {
        success: false,
        error: res.error || 'Validation request failed',
        isBillingError: isBilling,
      };
    }
  } catch (err) {
    const errStr = (err.message || '').toLowerCase();
    const isBilling = errStr.includes('402') ||
      errStr.includes('403') ||
      errStr.includes('insufficient_quota') ||
      errStr.includes('credit_balance') ||
      errStr.includes('billing') ||
      errStr.includes('quota');

    return {
      success: false,
      error: err.message,
      isBillingError: isBilling,
    };
  }
}

/**
 * Main LLM chat completion entry point.
 * Options: { messages, temperature?, maxTokens?, jsonMode?, providerId?, modelId?, apiKey? }
 * @param {object} options
 * @returns {Promise<{ success: boolean, content: string|null, error?: string, isConfigured: boolean, usage?: object, latencyMs?: number, provider?: string, model?: string }>}
 */
async function chat(options = {}) {
  const activeCfg = getActiveConfig();
  const providerId = options.providerId || activeCfg.providerId;
  const modelId = options.modelId || activeCfg.modelId;
  const apiKey = options.apiKey || activeCfg.apiKey;

  if (!providerId || !modelId || !apiKey) {
    return {
      success: false,
      content: null,
      error: 'AI not configured',
      isConfigured: false,
    };
  }

  const provider = getProvider(providerId);
  if (!provider) {
    return {
      success: false,
      content: null,
      error: `Provider '${providerId}' is not registered`,
      isConfigured: true,
    };
  }

  const reqSpec = provider.buildChatRequest(modelId, options.messages || [], {
    apiKey,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    jsonMode: options.jsonMode,
  });

  let fetchUrl = reqSpec.url;
  if (reqSpec.queryParams) {
    const query = new URLSearchParams(reqSpec.queryParams).toString();
    fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + query;
  }

  const t0 = Date.now();
  const logger = getBrowserEngine();

  try {
    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers: reqSpec.headers,
      body: JSON.stringify(reqSpec.body),
    });

    const latencyMs = Date.now() - t0;

    if (!res.ok) {
      let errText = '';
      try {
        const json = await res.json();
        errText = json?.error?.message || json?.message || res.statusText;
      } catch {
        errText = res.statusText;
      }

      const errorMsg = `HTTP ${res.status} from ${provider.name} (${modelId}): ${errText}`;
      logger.log('info', `[LLM] Call to ${providerId}/${modelId} FAILED (${latencyMs}ms): ${errorMsg}`, {
        category: 'LLM',
        provider: providerId,
        model: modelId,
        latencyMs,
        error: errorMsg,
      });

      return {
        success: false,
        content: null,
        error: errorMsg,
        isConfigured: true,
        provider: providerId,
        model: modelId,
        latencyMs,
      };
    }

    const json = await res.json();
    const parsed = provider.parseChatResponse(json);

    logger.log('info', `[LLM] ${provider.name} (${modelId}) responded in ${latencyMs}ms (${parsed.usage?.totalTokens || 0} tokens)`, {
      category: 'LLM',
      provider: providerId,
      model: modelId,
      latencyMs,
      usage: parsed.usage,
    });

    return {
      success: true,
      content: parsed.text,
      error: null,
      isConfigured: true,
      usage: parsed.usage,
      latencyMs,
      provider: providerId,
      model: modelId,
    };
  } catch (err) {
    const latencyMs = Date.now() - t0;
    logger.log('info', `[LLM] Network exception calling ${providerId}/${modelId} (${latencyMs}ms): ${err.message}`, {
      category: 'LLM',
      provider: providerId,
      model: modelId,
      latencyMs,
      error: err.message,
    });

    return {
      success: false,
      content: null,
      error: `Network error: ${err.message}`,
      isConfigured: true,
      provider: providerId,
      model: modelId,
      latencyMs,
    };
  }
}

/**
 * Checks if selected model is still valid in cached/live model list.
 * @returns {Promise<{ valid: boolean, warning?: string }>}
 */
async function checkSelectedModelStatus() {
  const cfg = getActiveConfig();
  if (!cfg.providerId || !cfg.modelId) {
    return { valid: false, warning: 'AI Provider or Model not selected' };
  }

  try {
    const settings = db.getSettings() || {};
    let cache = {};
    if (settings.models_cache_json) {
      try {
        cache = JSON.parse(settings.models_cache_json);
      } catch {}
    }

    const providerCache = cache[cfg.providerId];
    if (providerCache && Array.isArray(providerCache.models)) {
      const exists = providerCache.models.some((m) => m.id === cfg.modelId);
      if (!exists) {
        return {
          valid: false,
          warning: `Your selected model '${cfg.modelId}' is no longer available — please reselect`,
        };
      }
    }
  } catch {
    // Ignore cache parse error
  }

  return { valid: true };
}

/**
 * Initializes background model cache auto-refresh (every 6 hours).
 */
function initAutoRefresh() {
  if (activeRefreshInterval) return;
  
  const refresh = async () => {
    const cfg = getActiveConfig();
    if (cfg.providerId && cfg.apiKey) {
      try {
        await fetchModels(cfg.providerId, cfg.apiKey);
      } catch {
        // Silent background refresh failure
      }
    }
  };

  // Initial trigger after 10s
  setTimeout(refresh, 10000);

  // Periodic 6h refresh
  activeRefreshInterval = setInterval(refresh, 6 * 60 * 60 * 1000);
}

module.exports = {
  listProviders,
  getProvider,
  getActiveConfig,
  fetchModels,
  validateModel,
  chat,
  checkSelectedModelStatus,
  initAutoRefresh,
};
