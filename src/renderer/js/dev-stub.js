'use strict';

/**
 * dev-stub.js — browser-only mock of the preload bridge (window.nrd).
 * No-ops in the packaged app where the real preload defines window.nrd first.
 */
(function () {
  if (window.nrd) return;

  const updaterSubs = [];
  const updaterState = {
    status: 'idle', version: null, currentVersion: '0.1.0',
    percent: 0, transferredMb: 0, totalMb: 50.1,
    bytesPerSecond: 0, etaSec: null, message: null,
  };
  const emit = (subs, payload) => subs.forEach((fn) => fn(payload));

  window.nrd = {
    minimize: () => {},
    toggleMaximize: () => {},
    closeWindow: () => {},
    onWindowFlags: () => () => {},

    init: async () => ({
      name: 'Niche Research Department', shortName: 'NRD',
      tagline: 'Agentic Intelligence for Niche Discovery',
      version: '0.1.0', electron: '44.3.0', chrome: '142.0.7438.0',
      platform: 'win32', maximized: false,
    }),

    getSettings: async () => ({
      theme: localStorage.getItem('nrd.theme') || 'dark',
      autoApprove: false,
      language: 'en',
      sidebarCollapsed: false,
      reduceMotion: false,
    }),

    setSettings: async (patch) => {
      if (patch.theme) localStorage.setItem('nrd.theme', patch.theme);
      return {};
    },

    updaterGetState: async () => ({ ...updaterState }),
    updaterCheck: async () => {
      Object.assign(updaterState, { status: 'available', version: '0.2.0', message: 'New version available — v0.2.0' });
      emit(updaterSubs, { ...updaterState });
      return { ...updaterState };
    },
    updaterDownload: async () => {
      Object.assign(updaterState, { status: 'downloading', percent: 0, transferredMb: 0 });
      emit(updaterSubs, { ...updaterState });
      for (let p = 10; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 320));
        Object.assign(updaterState, {
          percent: p,
          transferredMb: Math.round(50.1 * (p / 100) * 10) / 10,
          bytesPerSecond: 1_450_000,
          etaSec: Math.round((100 - p) * 0.32),
        });
        emit(updaterSubs, { ...updaterState });
      }
      Object.assign(updaterState, { status: 'downloaded' });
      emit(updaterSubs, { ...updaterState });
      return { ...updaterState };
    },
    updaterInstall: () => {},
    onUpdaterState: (cb) => { updaterSubs.push(cb); return () => {}; },

    showMessage: () => {},
    isMac: false,
  };

  if (!window.dbAPI) {
    window.dbAPI = {
      getSettings: async () => {
        try {
          const res = await fetch('/api/db/settings');
          return await res.json();
        } catch {
          return { theme: 'dark', language: 'en', autoApprove: false, schemaVersion: 1 };
        }
      },
      saveSettings: async (patch) => {
        const res = await fetch('/api/db/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        return await res.json();
      },
      getCountries: async (activeOnly) => {
        const res = await fetch(`/api/db/countries?activeOnly=${activeOnly ? '1' : '0'}`);
        return await res.json();
      },
      createRun: async (runData, countryCodes, criteriaBrief) => {
        const res = await fetch('/api/db/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runData, countryCodes, criteriaBrief }),
        });
        return await res.json();
      },
      buildPlan: async (runId) => {
        const res = await fetch(`/api/db/runs/${runId}/plan`, { method: 'POST' });
        return await res.json();
      },
      getRun: async (runId) => {
        const res = await fetch(`/api/db/runs/${runId}`);
        return await res.json();
      },
      parseRun: async (runId) => {
        const res = await fetch(`/api/db/runs/${runId}/parse`, {
          method: 'POST',
        });
        return await res.json();
      },
      getRuns: async (options = {}) => {
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        const res = await fetch(`/api/db/runs?limit=${limit}&offset=${offset}`);
        return await res.json();
      },
      updateAgentStatus: async (runId, agentNumber, statusUpdate) => {
        const res = await fetch('/api/db/agent-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId, agentNumber, statusUpdate }),
        });
        return await res.json();
      },
      getNichesByRun: async (runId) => {
        const res = await fetch(`/api/db/niches?runId=${runId}`);
        return await res.json();
      },
      getCounts: async () => {
        try {
          const res = await fetch('/api/db/counts');
          return await res.json();
        } catch {
          return { runs: 0, niches: 0, reports: 0, countries: 0 };
        }
      },
      getDbHealth: async () => {
        try {
          const res = await fetch('/api/db/health');
          return await res.json();
        } catch {
          return { dbPath: '', schemaVersion: 1, dbSizeBytes: 0, tables: {} };
        }
      },
      insert: async (table, data) => {
        const res = await fetch('/api/db/crud/insert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, data }),
        });
        return await res.json();
      },
      update: async (table, idOrWhere, data) => {
        const res = await fetch('/api/db/crud/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, idOrWhere, data }),
        });
        return await res.json();
      },
      findBy: async (table, where, options) => {
        const res = await fetch('/api/db/crud/findBy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, where, options }),
        });
        return await res.json();
      },
      findOne: async (table, where) => {
        const res = await fetch('/api/db/crud/findOne', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, where }),
        });
        return await res.json();
      },
      deleteBy: async (table, where) => {
        const res = await fetch('/api/db/crud/deleteBy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, where }),
        });
        return await res.json();
      },
      count: async (table, where) => {
        const res = await fetch('/api/db/crud/count', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, where }),
        });
        return await res.json();
      },
    };
  }

  if (!window.engineAPI) {
    const engineListeners = {
      log: [],
      captchaDetected: [],
      captchaResolved: [],
      slotsUpdated: [],
      rateLimiterWait: [],
      runStatus: [],
      agentStatus: [],
    };

    window.engineAPI = {
      getSlots: async () => [
        { id: 1, status: 'idle', currentDomain: null, lastActivity: null },
        { id: 2, status: 'idle', currentDomain: null, lastActivity: null },
        { id: 3, status: 'idle', currentDomain: null, lastActivity: null },
      ],
      getCacheStats: async () => ({
        totalEntries: 4,
        totalHits: 12,
        totalSizeBytes: 34820,
        activeEntries: 4,
      }),
      pruneCache: async () => ({ prunedCount: 0 }),
      getRateLimiterTelemetry: async () => ({
        requestsTotal: 8,
        waitsTotal: 1,
        totalWaitMs: 350,
      }),
      getTimingSummary: async (runId) => {
        try {
          const res = await fetch(`/api/engine/timing-summary?runId=${runId || ''}`);
          return await res.json();
        } catch {
          return { totalOperations: 0, totalDurationMs: 0, cacheHits: 0, rateLimitWaitsCount: 0, captchaCount: 0, breakdown: [] };
        }
      },
      getTimingLogs: async (options = {}) => {
        try {
          const res = await fetch(`/api/engine/timing-logs?limit=${options.limit || 50}&runId=${options.runId || ''}`);
          return await res.json();
        } catch {
          return [];
        }
      },
      getQualityReviews: async (runId, options = {}) => {
        try {
          const res = await fetch(`/api/engine/quality-reviews?runId=${runId || ''}&limit=${options.limit || 100}`);
          return await res.json();
        } catch {
          return [];
        }
      },
      getQualitySummary: async (runId) => {
        try {
          const res = await fetch(`/api/engine/quality-summary?runId=${runId || ''}`);
          return await res.json();
        } catch {
          return { totalReviews: 0, totalPassed: 0, totalSendBacks: 0, totalEscalated: 0, passRatePct: 100, recentReviews: [], topFailedAgents: [], topFailedRules: [] };
        }
      },
      searchGoogle: async () => ({ results: [], cached: true }),
      startRun: async (runId, options) => {
        const res = await fetch(`/api/engine/runs/${runId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options || {}),
        });
        return await res.json();
      },
      approveRun: async (runId, approvedNiches) => {
        const res = await fetch(`/api/engine/runs/${runId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvedNiches }),
        });
        return await res.json();
      },
      pauseRun: async (runId) => {
        const res = await fetch(`/api/engine/runs/${runId}/pause`, { method: 'POST' });
        return await res.json();
      },
      cancelRun: async (runId) => {
        const res = await fetch(`/api/engine/runs/${runId}/cancel`, { method: 'POST' });
        return await res.json();
      },
      listAgents: async () => {
        const res = await fetch('/api/engine/agents');
        return await res.json();
      },
      runTest: async (testName) => {
        await new Promise((r) => setTimeout(r, 600));
        return {
          success: true,
          test: testName,
          channel: 'chrome',
          parallelSlots: [1, 2, 3],
          timestamp: new Date().toISOString(),
          message: `Browser Engine Test [${testName}] passed with real Chrome profile verification.`,
        };
      },
      onLog: (cb) => { engineListeners.log.push(cb); return () => {}; },
      onCaptchaDetected: (cb) => { engineListeners.captchaDetected.push(cb); return () => {}; },
      onCaptchaResolved: (cb) => { engineListeners.captchaResolved.push(cb); return () => {}; },
      onSlotsUpdated: (cb) => { engineListeners.slotsUpdated.push(cb); return () => {}; },
      onRateLimiterWait: (cb) => { engineListeners.rateLimiterWait.push(cb); return () => {}; },
      onRunStatus: (cb) => { engineListeners.runStatus.push(cb); return () => {}; },
      onAgentStatus: (cb) => { engineListeners.agentStatus.push(cb); return () => {}; },
    };
  }
})();

