'use strict';

/**
 * NRD · llmClient.js — Unified LLM Client Interface (P1.3c/d)
 * Standardized client routing across Google Gemini, OpenAI, Anthropic, and Groq.
 * All HTTP calls execute in the Main Process via httpClient (net.fetch + fallbacks).
 */

const db = require('../db');
const { getProvider, listProviders } = require('./llmProviders');
const httpClient = require('./httpClient');
const { emitLog } = require('../engine/logBus');

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

  // API key search order: DB settings per provider -> environment variable
  let apiKey = null;
  if (providerId === 'gemini') apiKey = settings.gemini_api_key || settings.geminiApiKey || process.env.GEMINI_API_KEY || null;
  else if (providerId === 'openai') apiKey = settings.openai_api_key || settings.openaiApiKey || process.env.OPENAI_API_KEY || null;
  else if (providerId === 'anthropic') apiKey = settings.anthropic_api_key || settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
  else if (providerId === 'groq') apiKey = settings.groq_api_key || settings.groqApiKey || process.env.GROQ_API_KEY || null;

  return { providerId, modelId, apiKey };
}

/**
 * Fetches live chat models from provider API and updates local DB cache.
 * Returns structured result:
 * { ok: boolean, status: number, models?: Array, providerMessage?: string, errorCode?: string, hint?: string, error?: string }
 * @param {string} providerId
 * @param {string} apiKey
 * @returns {Promise<{ ok: boolean, status: number, models?: Array, providerMessage?: string, errorCode?: string, hint?: string, error?: string }>}
 */
async function fetchModels(providerId, apiKey) {
  const provider = getProvider(providerId);
  if (!provider) {
    return {
      ok: false,
      status: 400,
      providerMessage: `Unknown provider '${providerId}'`,
      errorCode: 'UNKNOWN_PROVIDER',
      hint: 'Supported providers: Google Gemini, OpenAI, Anthropic, Groq.',
      error: `Unknown provider '${providerId}'`,
    };
  }

  const result = await provider.fetchModels(apiKey);
  if (!result.ok) {
    return result;
  }

  emitLog('LLM', `📋 Models refreshed: ${result.models.length} models available for ${provider.name}`, { provider: providerId, count: result.models.length });

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
      models: result.models,
    };

    db.saveSettings({
      models_cache_json: JSON.stringify(cache),
      models_cache_fetched_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal cache write failure
  }

  return result;
}

/**
 * Runs a tiny validation call against a specific provider & model to verify credentials & billing.
 * @param {object} params
 * @param {string} params.providerId
 * @param {string} params.modelId
 * @param {string} params.apiKey
 * @returns {Promise<{ ok: boolean, success: boolean, status?: number, providerMessage?: string, errorCode?: string, hint?: string, isBillingError?: boolean, error?: string }>}
 */
async function validateModel({ providerId, modelId, apiKey }) {
  if (!providerId || !modelId || !apiKey) {
    return {
      ok: false,
      success: false,
      status: 400,
      providerMessage: 'Provider, model, and API key are required for validation',
      errorCode: 'MISSING_PARAMS',
      hint: 'Please provide valid Provider, Model, and API Key.',
      error: 'Provider, model, and API key are required for validation',
    };
  }

  const t0_val = Date.now();
  const res = await chat({
    providerId,
    modelId,
    apiKey,
    messages: [{ role: 'user', content: 'Reply with: OK' }],
    maxTokens: 10,
  });
  const valLatency = Date.now() - t0_val;

  if (res.success) {
    emitLog('LLM', `🔍 Model validation: ${providerId}/${modelId} -> OK (${valLatency}ms)`, { provider: providerId, model: modelId, durationMs: valLatency });
    return {
      ok: true,
      success: true,
      status: 200,
      providerMessage: 'Validation succeeded',
    };
  } else {
    emitLog('LLM', `❌ Model validation failed: ${providerId}/${modelId} -> ${res.providerMessage || res.error}`, { provider: providerId, model: modelId });
    return {
      ok: false,
      success: false,
      status: res.status,
      providerMessage: res.providerMessage || res.error,
      errorCode: res.errorCode,
      hint: res.hint,
      isBillingError: !!res.isBillingError,
      error: res.error || res.providerMessage,
    };
  }
}

/**
 * Main LLM chat completion entry point.
 * Options: { messages, temperature?, maxTokens?, jsonMode?, providerId?, modelId?, apiKey? }
 * @param {object} options
 * @returns {Promise<{ ok: boolean, success: boolean, content: string|null, error?: string, providerMessage?: string, errorCode?: string, hint?: string, isBillingError?: boolean, isConfigured: boolean, usage?: object, latencyMs?: number, provider?: string, model?: string }>}
 */
async function chat(options = {}) {
  const activeCfg = getActiveConfig();
  const providerId = options.providerId || activeCfg.providerId;
  const modelId = options.modelId || activeCfg.modelId;
  const apiKey = options.apiKey || activeCfg.apiKey;

  if (!providerId || !modelId || !apiKey) {
    return {
      ok: false,
      success: false,
      content: null,
      error: 'AI not configured',
      providerMessage: 'AI not configured — please configure an API key in Settings',
      errorCode: 'NOT_CONFIGURED',
      hint: 'Settings → AI Provider mein ja kar key configure karein.',
      isConfigured: false,
    };
  }

  const provider = getProvider(providerId);
  if (!provider) {
    return {
      ok: false,
      success: false,
      content: null,
      error: `Provider '${providerId}' is not registered`,
      providerMessage: `Provider '${providerId}' is not registered`,
      errorCode: 'UNKNOWN_PROVIDER',
      hint: 'Supported providers: Google Gemini, OpenAI, Anthropic, Groq.',
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

  const promptChars = (options.messages || []).reduce((acc, m) => acc + (m.content ? m.content.length : 0), 0);
  emitLog('LLM', `🌐 Request sent to ${provider.name}/${modelId} (prompt length: ${promptChars} chars)`, {
    provider: providerId,
    model: modelId,
    promptChars,
  });

  const t0 = Date.now();
  const logger = getBrowserEngine();

  const res = await httpClient.request(
    fetchUrl,
    {
      method: 'POST',
      headers: reqSpec.headers,
      body: JSON.stringify(reqSpec.body),
    },
    { provider: provider.name, providerId, modelId }
  );

  const latencyMs = Date.now() - t0;

  if (!res.ok) {
    const errTextLower = (res.providerMessage || '').toLowerCase();
    const isBilling = (
      res.status === 402 ||
      res.status === 429 ||
      (res.status === 403 && errTextLower.includes('billing')) ||
      errTextLower.includes('insufficient_quota') ||
      errTextLower.includes('quota') ||
      errTextLower.includes('credit_balance')
    );

    const isModelNotFound = (
      res.status === 404 ||
      res.errorCode === 'MODEL_NOT_FOUND' ||
      errTextLower.includes('not found') ||
      errTextLower.includes('is not found') ||
      errTextLower.includes('does not exist') ||
      errTextLower.includes('no longer available') ||
      errTextLower.includes('model_not_found') ||
      errTextLower.includes('resource has been exhausted') === false && errTextLower.includes('not supported')
    );

    const errReason = res.providerMessage || res.error || 'Unknown error';
    emitLog('LLM', `❌ Request failed (${provider.name}/${modelId}) — status ${res.status || 'ERR'}: ${errReason}`, {
      provider: providerId,
      model: modelId,
      status: res.status,
      error: errReason,
    });

    if (res.status === 429 || isBilling) {
      emitLog('RATE LIMIT', `⚠️ Quota/rate limit reached on ${provider.name} — status ${res.status}: ${errReason}`, {
        provider: providerId,
        model: modelId,
      });
    }

    if (isModelNotFound) {
      const reasonMsg = `Your selected model '${modelId}' is no longer available from ${provider.name} — please reselect in Settings.`;
      emitLog('LLM', `⚠️ Model expired or not found: ${provider.name}/${modelId} (HTTP ${res.status})`, {
        provider: providerId,
        model: modelId,
      });

      // Update app_settings with invalid model flag
      try {
        if (typeof db.saveSettings === 'function') {
          db.saveSettings({
            ai_model_invalid: 1,
            ai_model_invalid_reason: reasonMsg,
          });
        }
      } catch (err) {
        console.error('[llmClient] Failed to mark model as invalid in settings:', err.message);
      }

      // Automatically trigger background model list refresh
      if (apiKey) {
        fetchModels(providerId, apiKey).catch(() => {});
      }
    }

    return {
      ok: false,
      success: false,
      content: null,
      status: res.status,
      providerMessage: res.providerMessage,
      errorCode: isModelNotFound ? 'MODEL_NOT_FOUND' : res.errorCode,
      hint: isModelNotFound ? 'Selected model is discontinued or not found. Go to Settings → AI Provider and choose an active model.' : res.hint,
      isBillingError: isBilling,
      isModelNotFound,
      error: res.error || res.providerMessage,
      isConfigured: true,
      provider: providerId,
      model: modelId,
      latencyMs,
    };
  }

  try {
    const parsed = provider.parseChatResponse(res.data);
    const tokens = parsed.usage?.totalTokens || (parsed.usage?.promptTokens || 0) + (parsed.usage?.completionTokens || 0);
    const tokenStr = tokens > 0 ? `${tokens} tokens` : `${parsed.text?.length || 0} chars`;

    emitLog('LLM', `📥 Response received from ${provider.name}/${modelId} in ${latencyMs}ms — ${tokenStr}`, {
      provider: providerId,
      model: modelId,
      latencyMs,
      usage: parsed.usage,
    });

    logger.log('info', `[LLM] ${provider.name} (${modelId}) responded in ${latencyMs}ms (${parsed.usage?.totalTokens || 0} tokens)`, {
      category: 'LLM',
      provider: providerId,
      model: modelId,
      latencyMs,
      usage: parsed.usage,
    });

    return {
      ok: true,
      success: true,
      content: parsed.text,
      error: null,
      providerMessage: null,
      isConfigured: true,
      usage: parsed.usage,
      latencyMs,
      provider: providerId,
      model: modelId,
    };
  } catch (parseErr) {
    emitLog('LLM', `❌ Request failed (${provider.name}/${modelId}) — parse error: ${parseErr.message}`, {
      provider: providerId,
      model: modelId,
      error: parseErr.message,
    });

    return {
      ok: false,
      success: false,
      content: null,
      status: 200,
      providerMessage: `Failed to parse model response: ${parseErr.message}`,
      errorCode: 'PARSE_ERROR',
      hint: 'Provider returned an invalid JSON or empty response format.',
      error: parseErr.message,
      isConfigured: true,
      provider: providerId,
      model: modelId,
      latencyMs,
    };
  }
}

/**
 * Checks if selected model is still valid in cached/live model list or has been flagged invalid.
 * @returns {Promise<{ valid: boolean, warning?: string }>}
 */
async function checkSelectedModelStatus() {
  const cfg = getActiveConfig();
  if (!cfg.providerId || !cfg.modelId) {
    return { valid: false, warning: 'AI Provider or Model not selected' };
  }

  try {
    const settings = db.getSettings() || {};
    // Check if flagged invalid in database
    if (settings.ai_model_invalid || settings.aiModelInvalid) {
      return {
        valid: false,
        warning: settings.ai_model_invalid_reason || settings.aiModelInvalidReason || `Your selected model '${cfg.modelId}' is no longer available — please reselect in Settings`,
      };
    }

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
        const warning = `Your selected model '${cfg.modelId}' is no longer available from ${cfg.providerId} — please reselect in Settings`;
        try {
          db.saveSettings({
            ai_model_invalid: 1,
            ai_model_invalid_reason: warning,
          });
        } catch {}
        return {
          valid: false,
          warning,
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
