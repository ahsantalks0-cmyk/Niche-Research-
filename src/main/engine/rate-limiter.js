'use strict';

/**
 * NRD · rate-limiter.js — Process-Wide Global Token-Bucket Rate Limiter (Pillar 3)
 * 
 * Enforces global per-domain request limits across ALL slots, tabs, and agents:
 * - google.com: ~6-8 req/min total (default 7/min = 1 req per ~8.5s)
 * - Marketplaces: ~18-20 req/min (daraz, etsy, amazon, gumroad, clickbank, etc.)
 * - RDAP / Wayback: direct HTTP, 0 wait
 * - Shared across all slots — prevents bot-farm request spikes from single IP
 */

const EventEmitter = require('node:events');

class DomainBucket {
  constructor(domain, options = {}) {
    this.domain = domain;
    this.capacity = options.capacity || 2;
    this.tokens = options.tokens !== undefined ? options.tokens : this.capacity;
    this.perMinute = options.perMinute || 8;
    this.fillRate = this.perMinute / 60000; // tokens per millisecond
    this.lastRefill = Date.now();
    this.queue = [];
    this.timer = null;
  }

  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.fillRate);
    this.lastRefill = now;
  }

  processQueue() {
    this.refill();

    while (this.queue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const item = this.queue.shift();
      const waitedMs = Date.now() - item.enqueuedAt;
      item.resolve({ waitedMs, domain: this.domain });
    }

    if (this.queue.length > 0) {
      // Calculate milliseconds until next token becomes available
      const needed = 1 - this.tokens;
      const waitMs = Math.ceil(needed / this.fillRate);

      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.processQueue();
      }, Math.max(25, waitMs));
    }
  }

  acquire(meta = {}) {
    this.refill();

    if (this.tokens >= 1 && this.queue.length === 0) {
      this.tokens -= 1;
      return Promise.resolve({ waitedMs: 0, domain: this.domain });
    }

    return new Promise((resolve) => {
      this.queue.push({
        resolve,
        enqueuedAt: Date.now(),
        slotId: meta.slotId,
        taskRef: meta.taskRef,
      });

      this.processQueue();
    });
  }

  getStats() {
    this.refill();
    return {
      domain: this.domain,
      tokens: Math.round(this.tokens * 100) / 100,
      capacity: this.capacity,
      perMinute: this.perMinute,
      queueLength: this.queue.length,
    };
  }
}

class GlobalRateLimiter extends EventEmitter {
  constructor() {
    super();
    this.buckets = new Map();
    this.totalWaits = 0;
    this.totalWaitTimeMs = 0;

    // Standard preset rules
    this.rules = [
      { pattern: /(google\.[a-z.]+|google)/i, key: 'google.com', perMinute: 7, capacity: 2 },
      { pattern: /(daraz\.pk|daraz)/i, key: 'daraz.pk', perMinute: 18, capacity: 3 },
      { pattern: /(etsy\.com|etsy)/i, key: 'etsy.com', perMinute: 18, capacity: 3 },
      { pattern: /(amazon\.[a-z.]+|amazon)/i, key: 'amazon.*', perMinute: 18, capacity: 3 },
      { pattern: /(gumroad\.com|gumroad)/i, key: 'gumroad.com', perMinute: 20, capacity: 4 },
      { pattern: /(clickbank\.com|clickbank)/i, key: 'clickbank.com', perMinute: 20, capacity: 4 },
      { pattern: /(aliexpress\.com|aliexpress)/i, key: 'aliexpress.com', perMinute: 18, capacity: 3 },
      { pattern: /(rdap|wayback|archive\.org)/i, key: 'direct-http', perMinute: 9999, capacity: 100 },
    ];
  }

  resolveDomainKey(rawUrlOrDomain) {
    if (!rawUrlOrDomain) return 'default';
    let hostname = rawUrlOrDomain;

    try {
      if (rawUrlOrDomain.startsWith('http://') || rawUrlOrDomain.startsWith('https://')) {
        hostname = new URL(rawUrlOrDomain).hostname;
      }
    } catch {
      // Use raw input
    }

    for (const rule of this.rules) {
      if (rule.pattern.test(hostname)) {
        return rule.key;
      }
    }

    return hostname.toLowerCase();
  }

  getBucket(domainKey) {
    if (!this.buckets.has(domainKey)) {
      let perMinute = 22;
      let capacity = 3;

      for (const rule of this.rules) {
        if (rule.key === domainKey) {
          perMinute = rule.perMinute;
          capacity = rule.capacity;
          break;
        }
      }

      this.buckets.set(domainKey, new DomainBucket(domainKey, { perMinute, capacity }));
    }

    return this.buckets.get(domainKey);
  }

  /**
   * Requests permission to perform an external network request.
   * Resolves immediately if tokens available, or waits until token bucket replenishes.
   * @param {string} rawUrlOrDomain
   * @param {object} [meta]
   * @param {number|string} [meta.slotId]
   * @param {string} [meta.taskRef]
   * @returns {Promise<{ waitedMs: number, domain: string }>}
   */
  async acquire(rawUrlOrDomain, meta = {}) {
    const domainKey = this.resolveDomainKey(rawUrlOrDomain);
    if (domainKey === 'direct-http') {
      return { waitedMs: 0, domain: 'direct-http' };
    }

    const bucket = this.getBucket(domainKey);
    const result = await bucket.acquire(meta);

    if (result.waitedMs > 0) {
      this.totalWaits += 1;
      this.totalWaitTimeMs += result.waitedMs;
      this.emit('wait', {
        domain: domainKey,
        waitedMs: result.waitedMs,
        slotId: meta.slotId,
        taskRef: meta.taskRef,
      });
    }

    return result;
  }

  /**
   * Updates per-minute limit for a domain (e.g. from user settings).
   * @param {string} domainKey
   * @param {number} perMinute
   */
  configure(domainKey, perMinute) {
    const bucket = this.getBucket(domainKey);
    bucket.perMinute = perMinute;
    bucket.fillRate = perMinute / 60000;
  }

  getTelemetry() {
    const domainStats = {};
    for (const [k, b] of this.buckets.entries()) {
      domainStats[k] = b.getStats();
    }
    return {
      totalWaits: this.totalWaits,
      totalWaitTimeMs: this.totalWaitTimeMs,
      domains: domainStats,
    };
  }
}

// Global process-wide singleton
const globalRateLimiter = new GlobalRateLimiter();

module.exports = {
  GlobalRateLimiter,
  rateLimiter: globalRateLimiter,
};
