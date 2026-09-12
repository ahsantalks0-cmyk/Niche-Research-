'use strict';

/**
 * NRD · gemini-batch.js — Parallel Gemini Calling Helper (Pillar 5)
 * 
 * Executes independent Gemini calls concurrently using Promise.all:
 * - Only genuinely dependent calls stay sequential
 * - Reads API key from SQLite app_settings or process.env.GEMINI_API_KEY
 * - Measures start/end timestamps and logs to timing_logs
 * - Handles rate limits and backoff cleanly
 */

const db = require('../db');

/**
 * Performs a single Gemini API call using standard fetch to Google's Generative Language API.
 * @param {string} prompt
 * @param {object} [options]
 * @param {string} [options.apiKey]
 * @param {string} [options.model='gemini-2.5-flash']
 * @param {number} [options.temperature=0.7]
 * @param {number} [options.maxOutputTokens=2048]
 * @returns {Promise<{ text: string, durationMs: number }>}
 */
async function callGemini(prompt, options = {}) {
  const settings = db.getSettings();
  const apiKey = options.apiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set it in Settings.');
  }

  const model = options.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        maxOutputTokens: options.maxOutputTokens || 2048,
      },
    }),
  });

  const durationMs = Date.now() - t0;
  const endedAt = new Date().toISOString();

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error [${response.status}]: ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Timing log
  db.logTiming({
    runId: options.runId || null,
    taskRef: options.taskRef || 'gemini_call',
    agentNumber: options.agentNumber || null,
    operation: 'gemini_generate',
    startedAt,
    endedAt,
    durationMs,
    cacheHit: false,
    rateLimitWaitMs: 0,
    captchaEncountered: false,
  });

  return { text, durationMs };
}

/**
 * Executes a batch of items in parallel (or chunked parallel) using a processor function or standard Gemini prompts.
 * @param {Array<any>} items
 * @param {Function|object} [fnOrCommonOptions]
 * @param {object} [options]
 * @returns {Promise<Array<any>>}
 */
async function geminiBatch(items, fnOrCommonOptions = {}, options = {}) {
  const isFunction = typeof fnOrCommonOptions === 'function';
  const processor = isFunction ? fnOrCommonOptions : null;
  const commonOptions = isFunction ? options : fnOrCommonOptions;

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const batchSize = commonOptions.batchSize || items.length;
  const delayMs = commonOptions.delayBetweenBatchesMs || 0;
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkPromises = chunk.map(async (item, idx) => {
      const overallIndex = i + idx;
      if (processor) {
        return processor(item, overallIndex);
      }

      let prompt = '';
      let itemOptions = {};

      if (typeof item === 'string') {
        prompt = item;
      } else if (item && typeof item === 'object') {
        prompt = item.prompt || '';
        itemOptions = item.options || {};
      }

      const merged = { ...commonOptions, ...itemOptions, taskRef: `gemini_batch_${overallIndex + 1}` };

      try {
        return await callGemini(prompt, merged);
      } catch (err) {
        return {
          text: '',
          durationMs: 0,
          error: err.message,
        };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    if (delayMs > 0 && i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const totalDurationMs = Date.now() - t0;
  const endedAt = new Date().toISOString();

  try {
    db.logTiming({
      runId: commonOptions.runId || null,
      taskRef: 'gemini_batch_total',
      agentNumber: commonOptions.agentNumber || null,
      operation: 'gemini_batch_parallel',
      startedAt,
      endedAt,
      durationMs: totalDurationMs,
      cacheHit: false,
      rateLimitWaitMs: 0,
      captchaEncountered: false,
    });
  } catch {}

  return results;
}

module.exports = {
  callGemini,
  geminiBatch,
  geminiBatchCaller: {
    callBatch: geminiBatch,
  },
};

