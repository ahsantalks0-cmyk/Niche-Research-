'use strict';

/**
 * NRD · cache.js — Shared Page / Data Cache Layer (Pillar 1)
 * 
 * Reusable cross-agent cache stored persistently in SQLite (page_cache table):
 * - Keyed by (keyword + country_code + optional niche)
 * - First agent to fetch SERP/page extracts and saves data
 * - Subsequent agents (and other business modes) read from cache with 0ms browser fetch
 * - Configurable TTL (24-48 hours, default 24h)
 * - Emits real-time telemetry events for Live Logs
 */

const EventEmitter = require('node:events');
const db = require('../db');

class EngineCache extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Generates a normalized cache key.
   * Format: `kw:${keyword.toLowerCase().trim()}|cc:${countryCode.toUpperCase().trim()}`
   * @param {string} keyword
   * @param {string} countryCode
   * @param {string} [niche]
   * @returns {string}
   */
  generateKey(keyword, countryCode, niche = null) {
    const kw = (keyword || '').toLowerCase().trim();
    const cc = (countryCode || 'US').toUpperCase().trim();
    if (niche) {
      const n = niche.toLowerCase().trim();
      return `n:${n}|kw:${kw}|cc:${cc}`;
    }
    return `kw:${kw}|cc:${cc}`;
  }

  /**
   * Retrieves cached data if available and unexpired.
   * Checks both niche-specific and universal (cross-mode) keyword+country keys.
   * @param {string} keyword
   * @param {string} countryCode
   * @param {string} [niche]
   * @returns {object|null}
   */
  get(keyword, countryCode, niche = null) {
    // 1. Try niche-specific key if niche provided
    if (niche) {
      const specificKey = this.generateKey(keyword, countryCode, niche);
      const hit = db.cacheGet(specificKey);
      if (hit) {
        this.emit('hit', {
          cacheKey: specificKey,
          keyword,
          countryCode,
          niche,
          hitCount: hit.hitCount,
          crossMode: false,
        });
        return hit;
      }
    }

    // 2. Try universal keyword+country key (Cross-Mode Reuse)
    const universalKey = this.generateKey(keyword, countryCode);
    const universalHit = db.cacheGet(universalKey);
    if (universalHit) {
      this.emit('hit', {
        cacheKey: universalKey,
        keyword,
        countryCode,
        niche,
        hitCount: universalHit.hitCount,
        crossMode: true,
      });
      return universalHit;
    }

    this.emit('miss', {
      keyword,
      countryCode,
      niche,
    });
    return null;
  }

  /**
   * Stores fetched/extracted page data into the shared SQLite cache.
   * @param {object} params
   * @param {string} params.keyword
   * @param {string} params.countryCode
   * @param {string} [params.niche]
   * @param {any} params.data
   * @param {string} [params.rawHtmlPath]
   * @param {number} [params.ttlHours=24]
   * @param {boolean} [params.universal=true] Whether to also save as universal cross-mode key
   * @returns {object}
   */
  set({ keyword, countryCode, niche = null, data, rawHtmlPath = null, ttlHours = 24, universal = true }) {
    const defaultTtl = ttlHours || 24;

    // Save universal cross-mode key
    const universalKey = this.generateKey(keyword, countryCode);
    db.cacheSet({
      cacheKey: universalKey,
      nicheRef: niche,
      keyword,
      countryCode,
      data,
      rawHtmlPath,
      ttlHours: defaultTtl,
    });

    // If niche specified, also index under niche key
    if (niche) {
      const specificKey = this.generateKey(keyword, countryCode, niche);
      db.cacheSet({
        cacheKey: specificKey,
        nicheRef: niche,
        keyword,
        countryCode,
        data,
        rawHtmlPath,
        ttlHours: defaultTtl,
      });
    }

    this.emit('set', {
      keyword,
      countryCode,
      niche,
      ttlHours: defaultTtl,
    });

    return { keyword, countryCode, ttlHours: defaultTtl };
  }

  /**
   * Returns cache stats.
   */
  getStats() {
    return db.cacheStats();
  }

  /**
   * Cleans up expired cache entries.
   */
  prune() {
    return db.cachePruneExpired();
  }
}

const engineCache = new EngineCache();

module.exports = {
  EngineCache,
  engineCache,
};
