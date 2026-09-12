'use strict';

/**
 * NRD · pages/logs.js — Department-Wide Live Logs Page (Part 3).
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  let logEntries = [];
  let unsubLog = null;
  let unsubCaptchaDet = null;
  let unsubCaptchaRes = null;
  let unsubSlots = null;
  let unsubRateLimit = null;
  let unsubRunStatus = null;
  let unsubAgentStatus = null;

  let autoScroll = true;
  let activeTypeFilter = 'all';
  let activeSlotFilter = 'all';
  let searchQuery = '';

  function formatTime(iso) {
    if (!iso) return new Date().toLocaleTimeString('en-US', { hour12: false });
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleTimeString('en-US', { hour12: false });
  }

  function getLogClass(type, category) {
    const t = String(category || type || '').toLowerCase();
    if (t.includes('agent')) return 'log-agent';
    if (t.includes('qs')) return 'log-qs';
    if (t.includes('chain')) return 'log-chain';
    if (t.includes('llm')) return 'log-llm';
    if (t.includes('cache')) return 'log-cache';
    if (t.includes('rate') || t.includes('wait')) return 'log-ratelimit';
    if (t.includes('captcha')) return 'log-captcha';
    if (t.includes('error') || t.includes('failed')) return 'log-error';
    if (t.includes('timing')) return 'log-timing';
    return 'log-info';
  }

  function addEntry(entry) {
    const item = {
      timestamp: entry.timestamp || new Date().toISOString(),
      level: entry.level || 'info',
      type: entry.type || 'info',
      category: entry.category || (entry.type || 'info').toUpperCase(),
      slotId: entry.slotId || null,
      message: entry.message || (typeof entry === 'string' ? entry : JSON.stringify(entry)),
    };

    logEntries.push(item);
    if (logEntries.length > 2000) logEntries.shift();

    renderLogs();
  }

  async function loadHistoricalLogs() {
    if (window.engineAPI && window.engineAPI.getTimingLogs) {
      try {
        const logs = await window.engineAPI.getTimingLogs({ limit: 100 });
        if (Array.isArray(logs) && logs.length > 0) {
          logs.forEach((l) => {
            logEntries.push({
              timestamp: l.created_at || new Date().toISOString(),
              level: 'info',
              type: l.cache_hit ? 'cache' : 'timing',
              slotId: l.slot_id || null,
              message: `[${l.operation}] ${l.url || l.domain || ''} (${l.duration_ms}ms) ${l.cache_hit ? '• CACHE HIT' : ''}`,
            });
          });
          renderLogs();
        }
      } catch (err) {
        console.warn('[logs-page] Failed to fetch historical logs:', err);
      }
    }
  }

  function renderLogs() {
    const container = document.getElementById('full-terminal-body');
    if (!container) return;

    let filtered = logEntries;

    if (activeTypeFilter !== 'all') {
      filtered = filtered.filter((e) => {
        const t = (e.type + ' ' + e.message).toLowerCase();
        return t.includes(activeTypeFilter);
      });
    }

    if (activeSlotFilter !== 'all') {
      filtered = filtered.filter((e) => String(e.slotId) === String(activeSlotFilter));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => e.message.toLowerCase().includes(q));
    }

    const countEl = document.getElementById('logs-count-label');
    if (countEl) countEl.textContent = `${filtered.length} / ${logEntries.length} events`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="terminal-empty">
          Waiting for live agent & engine telemetry events…
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((e) => {
        const cls = getLogClass(e.type, e.category);
        const slotTag = e.slotId ? `<span class="log-slot">Slot #${e.slotId}</span>` : '';
        const categoryLabel = (e.category || e.type || 'info').toUpperCase();
        return `
          <div class="terminal-line ${cls}">
            <span class="log-time">${formatTime(e.timestamp)}</span>
            <span class="log-badge">${categoryLabel}</span>
            ${slotTag}
            <span class="log-msg">${escapeHTML(e.message)}</span>
          </div>
        `;
      })
      .join('');

    if (autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  window.NRDPages.logs = {
    title: 'Live Logs',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-logs';

      el.innerHTML = `
        <div class="page-head">
          <div>
            <h2>Department Live Telemetry</h2>
            <div class="ph-sub">Real-time streaming event stream across all 35 agents, Chrome slots, rate limiters, and timing engines.</div>
          </div>
          <div class="head-actions">
            <button class="btn btn-sm btn-outline ${autoScroll ? 'active' : ''}" id="btn-page-autoscroll">
              Auto-Scroll: ${autoScroll ? 'ON' : 'OFF'}
            </button>
            <button class="btn btn-sm btn-outline" id="btn-page-export">
              ${NRDIcons.get('download')} Export Logs
            </button>
            <button class="btn btn-sm btn-danger-outline" id="btn-page-clear">
              Clear Logs
            </button>
          </div>
        </div>

        <div class="toolbar">
          <div class="input ph-input" style="max-width:240px">
            ${NRDIcons.get('search')}
            <input type="text" id="logs-search-input" placeholder="Search log lines…" style="border:none;background:transparent;color:inherit;outline:none;width:100%" />
          </div>

          <div class="btn-group" id="logs-type-tabs">
            <button class="btn btn-sm btn-outline active" data-type="all">ALL</button>
            <button class="btn btn-sm btn-outline" data-type="agent">AGENT</button>
            <button class="btn btn-sm btn-outline" data-type="chain">CHAIN</button>
            <button class="btn btn-sm btn-outline" data-type="qs">QS</button>
            <button class="btn btn-sm btn-outline" data-type="llm">LLM</button>
            <button class="btn btn-sm btn-outline" data-type="browser">BROWSER</button>
            <button class="btn btn-sm btn-outline" data-type="cache">CACHE</button>
            <button class="btn btn-sm btn-outline" data-type="rate">RATE LIMIT</button>
            <button class="btn btn-sm btn-outline" data-type="captcha">CAPTCHA</button>
            <button class="btn btn-sm btn-outline" data-type="timing">TIMING</button>
          </div>

          <div class="spacer"></div>
          <span class="badge" id="logs-count-label">0 events</span>
        </div>

        <div class="panel full-terminal-panel">
          <div class="full-terminal-body" id="full-terminal-body">
            <div class="terminal-empty">Connecting to real-time engine telemetry stream…</div>
          </div>
        </div>
      `;

      return el;
    },

    mounted() {
      const searchInput = document.getElementById('logs-search-input');
      if (searchInput) {
        searchInput.value = searchQuery;
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value.trim();
          renderLogs();
        });
      }

      const typeTabs = document.getElementById('logs-type-tabs');
      if (typeTabs) {
        typeTabs.querySelectorAll('button').forEach((btn) => {
          btn.addEventListener('click', () => {
            typeTabs.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            activeTypeFilter = btn.dataset.type;
            renderLogs();
          });
        });
      }

      const scrollBtn = document.getElementById('btn-page-autoscroll');
      if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
          autoScroll = !autoScroll;
          scrollBtn.classList.toggle('active', autoScroll);
          scrollBtn.textContent = `Auto-Scroll: ${autoScroll ? 'ON' : 'OFF'}`;
        });
      }

      const clearBtn = document.getElementById('btn-page-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          logEntries = [];
          renderLogs();
        });
      }

      const exportBtn = document.getElementById('btn-page-export');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const text = logEntries.map((e) => `[${e.timestamp}] [${e.type.toUpperCase()}] ${e.message}`).join('\n');
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nrd-engine-logs-${Date.now()}.txt`;
          a.click();
          URL.revokeObjectURL(url);
        });
      }

      // Load initial historical logs if empty
      if (logEntries.length === 0) {
        loadHistoricalLogs();
      } else {
        renderLogs();
      }

      // Subscribe to real-time events
      if (window.engineAPI) {
        if (window.engineAPI.onLog) {
          unsubLog = window.engineAPI.onLog((e) => {
            if (typeof e === 'string') {
              addEntry({ timestamp: new Date().toISOString(), type: 'info', category: 'INFO', message: e });
            } else {
              addEntry({
                timestamp: e.timestamp || new Date().toISOString(),
                type: (e.category || e.level || 'info').toLowerCase(),
                category: e.category || 'INFO',
                slotId: e.slotId || null,
                message: e.message || '',
              });
            }
          });
        }
        if (window.engineAPI.onCaptchaDetected) unsubCaptchaDet = window.engineAPI.onCaptchaDetected((e) => addEntry({ type: 'captcha', message: `CAPTCHA detected on ${e.domain} (Slot #${e.slotId})` }));
        if (window.engineAPI.onCaptchaResolved) unsubCaptchaRes = window.engineAPI.onCaptchaResolved((e) => addEntry({ type: 'captcha', message: `CAPTCHA resolved on Slot #${e.slotId}` }));
        if (window.engineAPI.onSlotsUpdated) unsubSlots = window.engineAPI.onSlotsUpdated((e) => addEntry({ type: 'browser', message: `Chrome Slots updated: ${JSON.stringify(e)}` }));
        if (window.engineAPI.onRateLimiterWait) unsubRateLimit = window.engineAPI.onRateLimiterWait((e) => addEntry({ type: 'rate', message: `Rate limiter pause: waiting ${e.waitMs || e}ms` }));
        if (window.engineAPI.onRunStatus) unsubRunStatus = window.engineAPI.onRunStatus((e) => addEntry({ type: 'run', message: `Run #${e.runId} status changed to '${e.status}'` }));
        if (window.engineAPI.onAgentStatus) unsubAgentStatus = window.engineAPI.onAgentStatus((e) => addEntry({ type: 'agent', message: `Agent #${e.agentNumber} (${e.agentName}) -> ${e.status}: ${e.outputSummary || ''}` }));
      }
    },

    destroy() {
      if (typeof unsubLog === 'function') unsubLog();
      if (typeof unsubCaptchaDet === 'function') unsubCaptchaDet();
      if (typeof unsubCaptchaRes === 'function') unsubCaptchaRes();
      if (typeof unsubSlots === 'function') unsubSlots();
      if (typeof unsubRateLimit === 'function') unsubRateLimit();
      if (typeof unsubRunStatus === 'function') unsubRunStatus();
      if (typeof unsubAgentStatus === 'function') unsubAgentStatus();
    },
  };
})();
