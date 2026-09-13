'use strict';

/**
 * NRD · pages/runs.js — Research Runs List View (Part 1).
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  let refreshTimer = null;
  let unsubRunStatus = null;
  let unsubAgentStatus = null;
  let currentRuns = [];
  let filterStatus = 'all';
  let searchQuery = '';

  function formatTimeAgo(dateStr) {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (sec < 60) return `${Math.max(0, sec)}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatElapsed(run) {
    if (!run.created_at) return '0s';
    const start = new Date(run.created_at.replace(' ', 'T') + 'Z').getTime();
    const end = run.completed_at
      ? new Date(run.completed_at.replace(' ', 'T') + 'Z').getTime()
      : Date.now();
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  function getStatusChipHTML(status) {
    const s = String(status || 'pending').toLowerCase();
    switch (s) {
      case 'pending':
        return `<span class="run-status-chip status-pending"><span class="sc-dot"></span>Pending</span>`;
      case 'planning':
        return `<span class="run-status-chip status-planning"><span class="sc-dot"></span>Planning</span>`;
      case 'discovery':
        return `<span class="run-status-chip status-discovery"><span class="sc-dot"></span>Discovery</span>`;
      case 'awaiting_approval':
        return `<span class="run-status-chip status-awaiting pulse-amber"><span class="sc-dot"></span>Awaiting Approval</span>`;
      case 'deep_research':
        return `<span class="run-status-chip status-deep-research"><span class="sc-dot"></span>Deep Research</span>`;
      case 'scoring':
        return `<span class="run-status-chip status-scoring"><span class="sc-dot"></span>Scoring</span>`;
      case 'qa':
        return `<span class="run-status-chip status-qa"><span class="sc-dot"></span>QA & Reporting</span>`;
      case 'completed':
        return `<span class="run-status-chip status-completed"><span class="sc-dot"></span>Completed</span>`;
      case 'failed':
        return `<span class="run-status-chip status-failed"><span class="sc-dot"></span>Failed</span>`;
      case 'cancelled':
        return `<span class="run-status-chip status-cancelled"><span class="sc-dot"></span>Cancelled</span>`;
      default:
        return `<span class="run-status-chip status-pending"><span class="sc-dot"></span>${s}</span>`;
    }
  }

  function getInputModeBadgeHTML(mode) {
    const m = String(mode || 'discovery').toLowerCase();
    if (m === 'own_niche') {
      return `<span class="mode-badge mode-own-niche">Own Niche</span>`;
    } else if (m === 'own_domain') {
      return `<span class="mode-badge mode-own-domain">Own Domain</span>`;
    }
    return `<span class="mode-badge mode-discovery">Discovery</span>`;
  }

  function renderRunCard(run) {
    const modes = Array.isArray(run.business_modes) ? run.business_modes : [];
    const modeTags = modes.map((bm) => `<span class="bm-chip">${bm}</span>`).join(' ');

    const countryList = Array.isArray(run.countries) && run.countries.length > 0
      ? run.countries.map((c) => c.country_name || c.country_code).join(', ')
      : '⚡ Auto-Potential';

    const briefChip = run.has_brief
      ? `<span class="brief-chip brief-parsed" title="Criteria Parsed ✓">Parsed ✓</span>`
      : `<span class="brief-chip brief-parsing" title="Criteria Brief Processing">Briefing…</span>`;

    const scheduledBadge = run.trigger_source === 'scheduler' || run.trigger_source === 'scheduled' || run.schedule_id
      ? `<span class="badge" style="background:rgba(147, 51, 234, 0.15); color:#c084fc; border:1px solid rgba(147, 51, 234, 0.3); font-size:10px; padding:2px 6px; border-radius:4px" title="Triggered by Schedule: ${run.schedule_name || '#' + run.schedule_id}">⏱️ Scheduled</span>`
      : '';

    return `
      <div class="run-card panel-hover" data-run-id="${run.id}">
        <div class="rc-header">
          <div class="rc-title-group">
            <span class="rc-id">#${run.id}</span>
            <span class="rc-name">${run.run_name || 'Research Run #' + run.id}</span>
            ${getInputModeBadgeHTML(run.input_mode)}
            ${scheduledBadge}
            ${briefChip}
          </div>
          <div class="rc-status">
            ${getStatusChipHTML(run.status)}
          </div>
        </div>

        <div class="rc-body">
          <div class="rc-meta-item">
            <span class="rc-label">Niche Target:</span>
            <span class="rc-val">${run.niche_quantity || 1} ${run.niche_quantity === 1 ? 'Niche' : 'Niches'}</span>
          </div>
          <div class="rc-meta-item">
            <span class="rc-label">Business Models:</span>
            <span class="rc-val">${modeTags || 'Blogging'}</span>
          </div>
          <div class="rc-meta-item">
            <span class="rc-label">Target Markets:</span>
            <span class="rc-val rc-countries">${countryList}</span>
          </div>
        </div>

        <div class="rc-footer">
          <div class="rc-time">
            <span>Created ${formatTimeAgo(run.created_at)}</span>
            <span class="dot-sep">•</span>
            <span>Elapsed: <strong>${formatElapsed(run)}</strong></span>
          </div>
          <div class="rc-action">
            <span class="btn-link">Mission Control →</span>
          </div>
        </div>
      </div>
    `;
  }

  async function loadRuns() {
    if (!window.dbAPI || !window.dbAPI.getRuns) return;
    try {
      currentRuns = await window.dbAPI.getRuns({ limit: 100 });
      renderList();
    } catch (err) {
      console.error('[runs-page] Failed to fetch runs:', err);
    }
  }

  function renderList() {
    const container = document.getElementById('runs-list-container');
    if (!container) return;

    let filtered = currentRuns;

    if (filterStatus === 'active') {
      filtered = filtered.filter((r) => ['planning', 'discovery', 'awaiting_approval', 'deep_research', 'scoring', 'qa'].includes(r.status));
    } else if (filterStatus === 'awaiting_approval') {
      filtered = filtered.filter((r) => r.status === 'awaiting_approval');
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter((r) => r.status === 'completed');
    } else if (filterStatus === 'failed') {
      filtered = filtered.filter((r) => r.status === 'failed' || r.status === 'cancelled');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        String(r.id).includes(q) ||
        (r.run_name || '').toLowerCase().includes(q) ||
        (r.input_mode || '').toLowerCase().includes(q) ||
        (r.own_niche_name || '').toLowerCase().includes(q)
      );
    }

    const countEl = document.getElementById('runs-count-badge');
    if (countEl) countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'run' : 'runs'}`;

    if (filtered.length === 0) {
      if (currentRuns.length === 0) {
        container.innerHTML = `
          <div class="panel empty">
            <div class="e-icon">${NRDIcons.get('play')}</div>
            <h3>No research runs created yet</h3>
            <p>Launch your first research run to deploy the 35-agent swarm and start discovering hyper-profitable niches.</p>
            <button class="btn btn-cu" data-goto="research">
              ${NRDIcons.get('play')} Create your first run
            </button>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="panel empty">
            <div class="e-icon">${NRDIcons.get('search')}</div>
            <h3>No runs match your search or filter</h3>
            <p>Try clearing your filter or searching for a different run ID or niche name.</p>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = `<div class="runs-grid">${filtered.map(renderRunCard).join('')}</div>`;

    // Add click listeners to navigate to Run Detail
    container.querySelectorAll('.run-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.runId;
        location.hash = `#/run-detail?id=${id}`;
      });
    });
  }

  window.NRDPages.runs = {
    title: 'Research Runs',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-runs';

      el.innerHTML = `
        <div class="page-head">
          <div>
            <h2>Research Runs</h2>
            <div class="ph-sub">Real-time tracking of all active, completed, and queued research missions.</div>
          </div>
          <button class="btn btn-cu" data-goto="research">
            ${NRDIcons.get('play')} + New Research
          </button>
        </div>

        <div class="toolbar">
          <div class="input ph-input" style="max-width:280px">
            ${NRDIcons.get('search')}
            <input type="text" id="runs-search-input" placeholder="Search runs by ID, mode or niche…" style="border:none;background:transparent;color:inherit;outline:none;width:100%" />
          </div>

          <div class="btn-group" id="runs-filter-tabs">
            <button class="btn btn-sm btn-outline active" data-filter="all">All</button>
            <button class="btn btn-sm btn-outline" data-filter="active">Active Swarms</button>
            <button class="btn btn-sm btn-outline btn-amber" data-filter="awaiting_approval">Awaiting Approval</button>
            <button class="btn btn-sm btn-outline" data-filter="completed">Completed</button>
            <button class="btn btn-sm btn-outline" data-filter="failed">Failed / Cancelled</button>
          </div>

          <div class="spacer"></div>
          <span class="badge" id="runs-count-badge">0 runs</span>
        </div>

        <div id="runs-list-container" class="runs-container">
          <div class="panel empty">
            <div class="spinner"></div>
            <p style="margin-top:12px;color:var(--text-dim)">Loading research runs from database…</p>
          </div>
        </div>
      `;

      return el;
    },

    mounted() {
      // Wire search and filter inputs
      const searchInput = document.getElementById('runs-search-input');
      if (searchInput) {
        searchInput.value = searchQuery;
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value.trim();
          renderList();
        });
      }

      const filterTabs = document.getElementById('runs-filter-tabs');
      if (filterTabs) {
        filterTabs.querySelectorAll('button').forEach((btn) => {
          btn.addEventListener('click', () => {
            filterTabs.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            filterStatus = btn.dataset.filter;
            renderList();
          });
        });
      }

      // Initial data load
      loadRuns();

      // Subscribe to live events
      if (window.engineAPI) {
        if (window.engineAPI.onRunStatus) {
          unsubRunStatus = window.engineAPI.onRunStatus(() => loadRuns());
        }
        if (window.engineAPI.onAgentStatus) {
          unsubAgentStatus = window.engineAPI.onAgentStatus(() => loadRuns());
        }
      }

      // Auto-poll every 2.5s while on page
      refreshTimer = setInterval(() => {
        loadRuns();
      }, 2500);
    },

    destroy() {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      if (typeof unsubRunStatus === 'function') unsubRunStatus();
      if (typeof unsubAgentStatus === 'function') unsubAgentStatus();
    },
  };
})();
