'use strict';

/**
 * NRD · httpClient.js — Robust Main Process HTTP Client (P1.3d)
 *
 * 3-Tier Execution Strategy:
 * 1. Electron net.fetch (Chromium network stack — handles system proxy, SSL stores, corporate networks)
 * 2. Node global fetch (undici)
 * 3. Node https/http module fallback
 *
 * Returns structured result:
 * { ok: boolean, status: number, statusText: string, providerMessage?: string, errorCode?: string, hint?: string, data?: any }
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

let preferredMethod = null; // 'electron_net' | 'global_fetch' | 'node_https'

function getBrowserEngineLogger() {
  try {
    const { browserEngine } = require('../engine/browser');
    return browserEngine;
  } catch {
    return {
      log: (level, msg) => console.log(`[NRD · LLM] ${msg}`),
    };
  }
}

/**
 * Maps error details to human-friendly diagnostic hints.
 * @param {number} status
 * @param {string} rawMessage
 * @param {string} errorCode
 * @returns {string}
 */
function getErrorHint(status, rawMessage = '', errorCode = '') {
  const msgLower = (rawMessage || '').toLowerCase();
  const codeUpper = (errorCode || '').toUpperCase();

  // 1. Quota / Rate limit
  if (
    status === 429 ||
    status === 402 ||
    msgLower.includes('quota') ||
    msgLower.includes('rate limit') ||
    msgLower.includes('resource_exhausted') ||
    msgLower.includes('billing') ||
    msgLower.includes('credit_balance')
  ) {
    return 'Rate limit / quota exceeded — thori dair baad try karein ya billing check karein';
  }

  // 2. Invalid API Key
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    msgLower.includes('api key') ||
    msgLower.includes('unauthorized') ||
    msgLower.includes('invalid_argument') ||
    msgLower.includes('invalid_api_key') ||
    msgLower.includes('authentication')
  ) {
    return 'Key ghalat hai — provider dashboard se sahi key copy karein';
  }

  // 3. SSL / Certificate errors
  if (
    codeUpper.includes('CERT') ||
    codeUpper.includes('UNABLE_TO_VERIFY') ||
    codeUpper.includes('SSL') ||
    msgLower.includes('certificate') ||
    msgLower.includes('self signed')
  ) {
    return 'SSL certificate issue — system date/time check karein ya VPN/proxy band kar ke try karein';
  }

  // 4. Network / Connection errors
  if (
    codeUpper === 'ENOTFOUND' ||
    codeUpper === 'ETIMEDOUT' ||
    codeUpper === 'ECONNREFUSED' ||
    codeUpper === 'ECONNRESET' ||
    codeUpper === 'EHOSTUNREACH' ||
    msgLower.includes('enotfound') ||
    msgLower.includes('fetch failed') ||
    msgLower.includes('network error')
  ) {
    return 'Internet connection ya firewall/proxy issue — connection check karein';
  }

  return 'Provider error — request settings aur parameters check karein.';
}

/**
 * Extracts clean provider error message from JSON/text response body.
 * @param {string} rawBody
 * @param {string} fallbackStatusText
 * @returns {{ message: string, code?: string }}
 */
function extractProviderErrorMessage(rawBody, fallbackStatusText = '') {
  if (!rawBody) {
    return { message: fallbackStatusText || 'Unknown Provider Error' };
  }

  let json = null;
  if (typeof rawBody === 'object') {
    json = rawBody;
  } else if (typeof rawBody === 'string') {
    try {
      json = JSON.parse(rawBody);
    } catch {
      // Not JSON string
    }
  }

  if (json && typeof json === 'object') {
    // Google Gemini: { error: { code: 400, message: "...", status: "INVALID_ARGUMENT" } }
    if (json.error && typeof json.error === 'object') {
      const msg = json.error.message || json.error.status || fallbackStatusText;
      const code = json.error.status || json.error.code || '';
      return { message: msg, code: String(code) };
    }

    // OpenAI & Groq: { error: { message: "...", type: "...", code: "..." } }
    if (json.error && typeof json.error.message === 'string') {
      return { message: json.error.message, code: json.error.code || json.error.type || '' };
    }

    // Anthropic: { type: "error", error: { type: "authentication_error", message: "..." } }
    if (json.type === 'error' && json.error?.message) {
      return { message: json.error.message, code: json.error.type || '' };
    }

    if (typeof json.message === 'string') {
      return { message: json.message, code: json.code || '' };
    }
  }

  const trimmed = typeof rawBody === 'string' ? rawBody.trim() : '';
  return { message: trimmed.slice(0, 300) || fallbackStatusText || 'Unknown Provider Error' };
}

async function tryElectronNet(url, options) {
  if (!process.versions || !process.versions.electron) {
    throw new Error('Not running inside Electron process');
  }
  const { net } = require('electron');
  if (!net || typeof net.fetch !== 'function') {
    throw new Error('net.fetch is not available');
  }
  return await net.fetch(url, options);
}

async function tryGlobalFetch(url, options) {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('global fetch is not available');
  }
  return await globalThis.fetch(url, options);
}

function tryNodeHttps(urlStr, options) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib = isHttps ? https : http;

      const reqOptions = {
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 30000,
      };

      const req = lib.request(parsedUrl, reqOptions, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const rawBuffer = Buffer.concat(chunks);
          const textBody = rawBuffer.toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage || '',
            text: async () => textBody,
            json: async () => JSON.parse(textBody),
          });
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        const err = new Error('Request timed out');
        err.code = 'ETIMEDOUT';
        reject(err);
      });

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Executes an HTTP request using the 3-tier fallback engine.
 * @param {string} urlStr
 * @param {object} options
 * @param {object} [providerMeta]
 * @returns {Promise<{ ok: boolean, status: number, statusText: string, providerMessage?: string, errorCode?: string, hint?: string, data?: any, error?: string }>}
 */
async function request(urlStr, options = {}, providerMeta = {}) {
  const logger = getBrowserEngineLogger();
  const providerName = providerMeta.provider || 'AI Provider';
  const parsedHost = (() => {
    try { return new URL(urlStr).hostname; } catch { return 'api'; }
  })();

  let res = null;
  let methodUsed = null;
  const methods = preferredMethod
    ? [preferredMethod, ...['electron_net', 'global_fetch', 'node_https'].filter((m) => m !== preferredMethod)]
    : ['electron_net', 'global_fetch', 'node_https'];

  let lastNetworkError = null;

  for (const m of methods) {
    try {
      if (m === 'electron_net') {
        res = await tryElectronNet(urlStr, options);
        methodUsed = 'electron_net';
        preferredMethod = 'electron_net';
        break;
      } else if (m === 'global_fetch') {
        res = await tryGlobalFetch(urlStr, options);
        methodUsed = 'global_fetch';
        preferredMethod = 'global_fetch';
        break;
      } else if (m === 'node_https') {
        res = await tryNodeHttps(urlStr, options);
        methodUsed = 'node_https';
        preferredMethod = 'node_https';
        break;
      }
    } catch (err) {
      lastNetworkError = err;
      // Retry other tiers on transport/network failures
      continue;
    }
  }

  // If all transport methods threw a network exception
  if (!res) {
    const errCode = lastNetworkError?.code || lastNetworkError?.cause?.code || 'NETWORK_ERROR';
    const rawMsg = lastNetworkError?.message || 'Network connection failed';
    const hint = getErrorHint(0, rawMsg, errCode);

    const logEntry = `[LLM] ${providerName} (${parsedHost}) Network Failure [${errCode}]: ${rawMsg} — Hint: ${hint}`;
    logger.log('info', logEntry, {
      category: 'LLM',
      provider: providerMeta.providerId,
      host: parsedHost,
      errorCode: errCode,
    });

    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      providerMessage: rawMsg,
      errorCode: String(errCode),
      hint,
      error: `[Network ${errCode}] ${rawMsg}`,
    };
  }

  // Process HTTP response body
  let rawBody = '';
  try {
    rawBody = await res.text();
  } catch {}

  if (!res.ok) {
    const parsed = extractProviderErrorMessage(rawBody, res.statusText);
    const errorCode = parsed.code || String(res.status);
    const hint = getErrorHint(res.status, parsed.message, errorCode);

    const logEntry = `[LLM] ${providerName} (${parsedHost}) HTTP ${res.status} [${errorCode}]: ${parsed.message} — Hint: ${hint}`;
    logger.log('info', logEntry, {
      category: 'LLM',
      provider: providerMeta.providerId,
      host: parsedHost,
      status: res.status,
      errorCode,
      providerMessage: parsed.message,
    });

    return {
      ok: false,
      status: res.status,
      statusText: res.statusText,
      providerMessage: parsed.message,
      errorCode: String(errorCode),
      hint,
      error: `[HTTP ${res.status}] ${parsed.message}`,
    };
  }

  // Parse JSON data for successful response
  let data = null;
  try {
    data = JSON.parse(rawBody);
  } catch {
    data = rawBody;
  }

  return {
    ok: true,
    status: res.status,
    statusText: res.statusText,
    data,
    methodUsed,
  };
}

module.exports = {
  request,
  getErrorHint,
  extractProviderErrorMessage,
};
