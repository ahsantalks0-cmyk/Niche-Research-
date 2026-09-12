'use strict';

/**
 * NRD · pages/run-detail.js — Mission Control Run Detail View (Part 2).
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  let refreshTimer = null;
  let unsubRunStatus = null;
  let unsubAgentStatus = null;
  let currentRunId = null;
  let runData = null;
  let timingData = null;
  let jsonExpanded = false;

  const PHASES = [
    { key: 'discovery', name: 'Phase 1: Discovery', layer: 'discovery', desc: 'Niche discovery & screening' },
    { key: 'approval_gate', name: 'Approval Gate', layer: 'approval_gate', desc: 'Human-in-the-loop review' },
    { key: 'deep_research', name: 'Phase 2: Deep Research', layer: 'deep_research', desc: '360° Multi-country intelligence' },
    { key: 'scoring', name: 'Phase 3: Scoring', layer: 'scoring', desc: 'Opportunity & risk verdict' },
    { key: 'qa', name: 'Phase 4: QA & Reporting', layer: 'qa_reporting', desc: 'Dossier audit & handoff' },
  ];

  function formatTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatElapsed(run) {
    if (!run || !run.created_at) return '0s';
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
        return `<span class="run-status-chip status-discovery"><span class="sc-dot"></span>Discovery Phase</span>`;
      case 'awaiting_approval':
        return `<span class="run-status-chip status-awaiting pulse-amber"><span class="sc-dot"></span>Awaiting Approval</span>`;
      case 'deep_research':
        return `<span class="run-status-chip status-deep-research"><span class="sc-dot"></span>Deep Research Phase</span>`;
      case 'scoring':
        return `<span class="run-status-chip status-scoring"><span class="sc-dot"></span>Scoring Phase</span>`;
      case 'qa':
        return `<span class="run-status-chip status-qa"><span class="sc-dot"></span>QA & Dossier Phase</span>`;
      case 'completed':
        return `<span class="run-status-chip status-completed"><span class="sc-dot"></span>Completed ✓</span>`;
      case 'failed':
        return `<span class="run-status-chip status-failed"><span class="sc-dot"></span>Failed ❌</span>`;
      case 'cancelled':
        return `<span class="run-status-chip status-cancelled"><span class="sc-dot"></span>Cancelled</span>`;
      default:
        return `<span class="run-status-chip status-pending"><span class="sc-dot"></span>${s}</span>`;
    }
  }

  function getAgentIcon(status) {
    const s = String(status || 'idle').toLowerCase();
    if (s === 'running') return `<span class="ag-icon ag-running" title="Running">🔄</span>`;
    if (s === 'done' || s === 'completed') return `<span class="ag-icon ag-done" title="Done">✅</span>`;
    if (s === 'failed') return `<span class="ag-icon ag-failed" title="Failed">❌</span>`;
    if (s === 'skipped' || s === 'pending') return `<span class="ag-icon ag-skipped" title="Skipped (Pending)">⏭</span>`;
    if (s === 'retrying') return `<span class="ag-icon ag-retrying" title="Retrying">🔁</span>`;
    return `<span class="ag-icon ag-idle" title="Queued">⏳</span>`;
  }

  async function loadData() {
    if (!currentRunId || !window.dbAPI) return;
    try {
      runData = await window.dbAPI.getRun(currentRunId);
      if (window.engineAPI && window.engineAPI.getTimingSummary) {
        timingData = await window.engineAPI.getTimingSummary(currentRunId);
      }
      renderView();
    } catch (err) {
      console.error('[run-detail] Failed to load run:', err);
    }
  }

  function renderView() {
    const container = document.getElementById('run-detail-container');
    if (!container) return;

    if (!runData) {
      container.innerHTML = `
        <div class="panel empty">
          <div class="e-icon">${NRDIcons.get('alert')}</div>
          <h3>Run not found</h3>
          <p>The requested research run #${currentRunId} does not exist in the database.</p>
          <button class="btn btn-outline" data-goto="runs">← Back to Runs</button>
        </div>
      `;
      return;
    }

    const run = runData;
    const brief = run.criteria?.parsed_brief;
    const criteriaError = run.criteria?.status === 'failed' ? run.criteria.error_message : null;
    const agents = Array.isArray(run.agents) ? run.agents : [];

    // Find active agent running right now
    const activeAgent = agents.find((a) => a.status === 'running') ||
      agents.filter((a) => a.status === 'done').pop();

    // Map agents into phase nodes
    const plan = run.dh_execution_plan || {};
    const units = Array.isArray(plan.units) ? plan.units : [];

    const isRunning = ['planning', 'discovery', 'deep_research', 'scoring', 'qa'].includes(run.status);
    const isPaused = run.status === 'awaiting_approval';
    const isFinished = run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled';

    container.innerHTML = `
      <!-- 1. RUN HEADER -->
      <div class="panel mc-header-panel">
        <div class="mc-nav-row">
          <button class="btn btn-sm btn-subtle" id="btn-back-to-runs">← Back to Runs</button>
          <div class="spacer"></div>
          <div class="mc-time-badge">
            Created ${run.created_at || '—'} • Total Elapsed: <strong>${formatElapsed(run)}</strong>
          </div>
        </div>

        <div class="mc-title-row">
          <div>
            <div class="mc-run-id-tag">Run #${run.id} Mission Control</div>
            <h2 class="mc-run-title">${run.run_name || 'Research Run #' + run.id}</h2>
            <div class="mc-badges">
              <span class="mode-badge mode-${run.input_mode}">${run.input_mode || 'discovery'}</span>
              ${(run.business_modes || []).map((b) => `<span class="bm-chip">${b}</span>`).join(' ')}
              <span class="bm-chip">${run.niche_quantity || 1} ${run.niche_quantity === 1 ? 'Niche' : 'Niches'}</span>
              <span class="bm-chip">${(run.countries || []).map((c) => c.country_code).join(', ') || '⚡ Auto-Potential'}</span>
            </div>
          </div>

          <div class="mc-status-actions">
            ${getStatusChipHTML(run.status)}
            <div class="mc-control-btns">
              ${isRunning ? `<button class="btn btn-sm btn-outline" id="btn-run-pause">${NRDIcons.get('pause')} Pause</button>` : ''}
              ${isPaused ? `<button class="btn btn-sm btn-cu" id="btn-run-resume">${NRDIcons.get('play')} Resume Chain</button>` : ''}
              ${!isFinished ? `<button class="btn btn-sm btn-danger-outline" id="btn-run-cancel">${NRDIcons.get('stop')} Cancel Run</button>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- 5. APPROVAL GATE UI (Prominent Amber Section if awaiting_approval) -->
      ${run.status === 'awaiting_approval' ? `
        <div class="panel approval-gate-card pulse-amber-glow">
          <div class="ag-card-header">
            <div class="ag-amber-icon">⚠️</div>
            <div>
              <h3>Discovery Phase Complete — Approval Gate Reached</h3>
              <p>Review the discovered niche list before granting approval to launch 360° Deep Multi-Country Research.</p>
            </div>
            <div class="spacer"></div>
            <span class="badge badge-amber">ACTION REQUIRED</span>
          </div>

          <div class="ag-body">
            <div class="ag-niche-preview-box">
              <div class="ag-preview-title">Discovered Niches Ready for Deep Research:</div>
              <div class="ag-preview-placeholder">
                <em>Niches will appear here after Discovery agents execute in Phase 3.x.</em>
              </div>
            </div>

            <div class="ag-actions">
              <button class="btn btn-cu btn-lg" id="btn-gate-approve">
                ⚡ Approve & Resume Deep Research
              </button>
              <button class="btn btn-outline" id="btn-gate-edit">
                ✏️ Edit Niche Selection
              </button>
              <button class="btn btn-subtle" id="btn-gate-cancel">
                Cancel Run
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 3. EXECUTION PLAN / PHASE TIMELINE -->
      <div class="panel mc-timeline-panel">
        <div class="panel-head">
          <div class="ph-title">35-Agent Execution Swarm Pipeline</div>
          <span class="ph-sub">Master execution plan generated by Agent #1 (Department Head)</span>
        </div>

        <div class="mc-phase-timeline">
          ${PHASES.map((p, idx) => {
            const isCurrent = run.status === p.key || (run.status === 'planning' && idx === 0);
            const isCompleted = isPhaseCompleted(run.status, p.key);
            let phaseClass = 'phase-node';
            if (isCurrent) phaseClass += ' phase-active gold-glow';
            else if (isCompleted) phaseClass += ' phase-completed';

            // Filter agents for this phase layer
            const phaseAgents = agents.filter((a) => {
              if (p.layer === 'approval_gate') return false;
              if (p.layer === 'discovery') return [6, 7, 8, 9, 10].includes(a.agent_number);
              if (p.layer === 'deep_research') return a.agent_number >= 11 && a.agent_number <= 26;
              if (p.layer === 'scoring') return a.agent_number >= 27 && a.agent_number <= 30;
              if (p.layer === 'qa_reporting') return a.agent_number >= 31 && a.agent_number <= 35;
              return false;
            });

            return `
              <div class="${phaseClass}">
                <div class="pn-header">
                  <span class="pn-step">${idx + 1}</span>
                  <span class="pn-title">${p.name}</span>
                  ${p.key === 'approval_gate' && (run.auto_approve || run.approval_gate_passed) ? '<span class="auto-app-badge">⚡ Auto-approved</span>' : ''}
                </div>
                <div class="pn-desc">${p.desc}</div>

                ${p.key === 'approval_gate' ? `
                  <div class="pn-gate-node ${run.approval_gate_passed ? 'gate-passed' : run.status === 'awaiting_approval' ? 'gate-waiting' : ''}">
                    ${run.approval_gate_passed ? '✅ Gate Passed' : run.status === 'awaiting_approval' ? '⏸ Awaiting User Approval' : '⏳ Queued'}
                  </div>
                ` : `
                  <div class="pn-agents-grid">
                    ${phaseAgents.map((ag) => `
                      <div class="ag-chip ag-status-${ag.status}" title="${ag.agent_name}: ${ag.status}">
                        ${getAgentIcon(ag.status)}
                        <span class="ag-num">#${ag.agent_number}</span>
                        <span class="ag-name">${ag.agent_name}</span>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 4. LIVE AGENT FEED -->
      <div class="panel mc-live-feed-panel">
        <div class="panel-head">
          <div class="ph-title">${NRDIcons.get('zap')} Live Telemetry & Active Agent Feed</div>
        </div>
        <div class="mc-live-feed-body">
          ${activeAgent ? `
            <div class="feed-agent-box ${activeAgent.status === 'running' ? 'pulse-border' : ''}">
              <div class="fa-icon">${getAgentIcon(activeAgent.status)}</div>
              <div class="fa-details">
                <div class="fa-top">
                  <strong class="fa-title">Agent #${activeAgent.agent_number}: ${activeAgent.agent_name}</strong>
                  <span class="fa-status-badge status-${activeAgent.status}">${activeAgent.status}</span>
                  <span class="fa-time">${activeAgent.started_at ? formatTime(activeAgent.started_at) : ''}</span>
                </div>
                <div class="fa-summary">${activeAgent.output_summary || 'Executing task instructions…'}</div>
              </div>
            </div>
          ` : `
            <div class="feed-idle">No agent active currently.</div>
          `}
        </div>
      </div>

      <!-- 2. MISSION BRIEF SECTION (P1.1) -->
      <div class="panel mc-brief-panel">
        <div class="panel-head">
          <div class="ph-title">${NRDIcons.get('doc')} Mission Brief (Criteria Parser Agent #2)</div>
          <button class="btn btn-sm btn-subtle" id="btn-toggle-json">
            ${jsonExpanded ? 'Hide Raw JSON' : '{ } View Parsed JSON'}
          </button>
        </div>

        ${criteriaError ? `
          <div class="alert alert-danger" style="margin-bottom:16px">
            <strong>Criteria Parsing Failed:</strong> ${criteriaError}
            <button class="btn btn-sm btn-danger" id="btn-reparse-criteria" style="margin-left:12px">Re-run Parser</button>
          </div>
        ` : ''}

        ${brief ? `
          <div class="brief-cards-grid">
            <div class="brief-card">
              <div class="bc-label">Niche Directives</div>
              <div class="bc-val">
                <strong>Mode:</strong> ${brief.input_mode || run.input_mode}<br/>
                <strong>Target Niches:</strong> ${brief.niche_quantity || run.niche_quantity || 1}<br/>
                ${brief.own_niche_name ? `<strong>Niche Name:</strong> ${brief.own_niche_name}<br/>` : ''}
                ${brief.domain ? `<strong>Domain:</strong> ${brief.domain}` : ''}
              </div>
            </div>

            <div class="brief-card">
              <div class="bc-label">Business & Monetization</div>
              <div class="bc-val">
                <strong>Business Models:</strong> ${(brief.business_modes || run.business_modes || []).join(', ')}<br/>
                <strong>Monetization Priorities:</strong> ${(brief.monetization_priorities || ['ad_revenue', 'affiliate', 'digital_products']).join(', ')}
              </div>
            </div>

            <div class="brief-card">
              <div class="bc-label">Target Markets</div>
              <div class="bc-val">
                <strong>Countries:</strong> ${(run.countries || []).map((c) => c.country_name || c.country_code).join(', ') || 'Auto-Potential Intelligence (Top 30)'}<br/>
                <strong>Geo Strategy:</strong> ${brief.geo_strategy || 'Tier 1 Focus'}
              </div>
            </div>

            <div class="brief-card">
              <div class="bc-label">Swarm Constraints</div>
              <div class="bc-val">
                <strong>Max Competition:</strong> ${brief.max_competition_level || run.competition_level || 'medium'}<br/>
                <strong>Auto Approve:</strong> ${run.auto_approve ? 'Enabled (Instant Pass)' : 'Disabled (Approval Gate Active)'}
              </div>
            </div>
          </div>
        ` : `
          <div class="empty-brief-box">
            <span>Criteria brief processing or waiting for Parser Agent #2…</span>
            <button class="btn btn-sm btn-outline" id="btn-reparse-criteria" style="margin-left:12px">Run Parser</button>
          </div>
        `}

        <div id="json-viewer-container" style="display:${jsonExpanded ? 'block' : 'none'}; margin-top:16px;">
          <pre class="json-code-box">${JSON.stringify(run.criteria?.parsed_brief || run.criteria || {}, null, 2)}</pre>
        </div>
      </div>

      <!-- 6. TIMING SUMMARY PANEL -->
      <div class="panel mc-timing-panel">
        <div class="panel-head">
          <div class="ph-title">${NRDIcons.get('clock')} Speed Architecture & Timing Instrumentation (P0.5)</div>
        </div>

        <div class="timing-stats-grid">
          <div class="ts-card">
            <div class="ts-val">${timingData ? Math.round(timingData.totalDurationMs / 1000) + 's' : formatElapsed(run)}</div>
            <div class="ts-label">Total Execution Duration</div>
          </div>
          <div class="ts-card">
            <div class="ts-val">${timingData ? timingData.cacheHits : 0}</div>
            <div class="ts-label">Engine Cache Hits</div>
          </div>
          <div class="ts-card">
            <div class="ts-val">${timingData ? timingData.rateLimitWaitsCount : 0}</div>
            <div class="ts-label">Rate Limiter Throttles</div>
          </div>
          <div class="ts-card">
            <div class="ts-val">${timingData ? timingData.captchaCount : 0}</div>
            <div class="ts-label">CAPTCHAs Solved</div>
          </div>
        </div>

        <div style="margin-top:16px">
          <h4 style="font-size:13px; font-weight:600; margin-bottom:8px">Agent Execution Durations Table</h4>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Agent #</th>
                  <th>Agent Name</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Finished</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                ${agents.map((ag) => `
                  <tr>
                    <td>#${ag.agent_number}</td>
                    <td><strong>${ag.agent_name}</strong></td>
                    <td><span class="ag-status-badge status-${ag.status}">${ag.status}</span></td>
                    <td>${ag.started_at ? formatTime(ag.started_at) : '—'}</td>
                    <td>${ag.finished_at ? formatTime(ag.finished_at) : '—'}</td>
                    <td class="td-summary">${ag.output_summary || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    wireEvents();
  }

  function isPhaseCompleted(runStatus, phaseKey) {
    const order = ['planning', 'discovery', 'awaiting_approval', 'deep_research', 'scoring', 'qa', 'completed'];
    const currentIdx = order.indexOf(runStatus);
    const phaseIdx = order.indexOf(phaseKey);
    return currentIdx > phaseIdx || runStatus === 'completed';
  }

  function wireEvents() {
    // Back button
    const backBtn = document.getElementById('btn-back-to-runs');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        location.hash = '#/runs';
      });
    }

    // Toggle JSON
    const jsonBtn = document.getElementById('btn-toggle-json');
    if (jsonBtn) {
      jsonBtn.addEventListener('click', () => {
        jsonExpanded = !jsonExpanded;
        const box = document.getElementById('json-viewer-container');
        if (box) box.style.display = jsonExpanded ? 'block' : 'none';
        jsonBtn.textContent = jsonExpanded ? 'Hide Raw JSON' : '{ } View Parsed JSON';
      });
    }

    // Pause button
    const pauseBtn = document.getElementById('btn-run-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', async () => {
        if (window.engineAPI && window.engineAPI.pauseRun) {
          await window.engineAPI.pauseRun(currentRunId);
          loadData();
        }
      });
    }

    // Resume button
    const resumeBtn = document.getElementById('btn-run-resume');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', async () => {
        if (window.engineAPI && window.engineAPI.startRun) {
          await window.engineAPI.startRun(currentRunId);
          loadData();
        }
      });
    }

    // Cancel button
    const cancelBtn = document.getElementById('btn-run-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to cancel Run #${currentRunId}? This will stop all active agent slots.`)) {
          if (window.engineAPI && window.engineAPI.cancelRun) {
            await window.engineAPI.cancelRun(currentRunId);
            loadData();
          }
        }
      });
    }

    // Gate Approve button
    const gateApproveBtn = document.getElementById('btn-gate-approve');
    if (gateApproveBtn) {
      gateApproveBtn.addEventListener('click', async () => {
        if (window.engineAPI && window.engineAPI.approveRun) {
          gateApproveBtn.disabled = true;
          gateApproveBtn.textContent = 'Approving & Resuming Chain…';
          await window.engineAPI.approveRun(currentRunId);
          loadData();
        }
      });
    }

    // Gate Cancel button
    const gateCancelBtn = document.getElementById('btn-gate-cancel');
    if (gateCancelBtn) {
      gateCancelBtn.addEventListener('click', async () => {
        if (confirm(`Cancel Run #${currentRunId}?`)) {
          if (window.engineAPI && window.engineAPI.cancelRun) {
            await window.engineAPI.cancelRun(currentRunId);
            loadData();
          }
        }
      });
    }

    // Reparse criteria button
    const reparseBtn = document.getElementById('btn-reparse-criteria');
    if (reparseBtn) {
      reparseBtn.addEventListener('click', async () => {
        if (window.dbAPI && window.dbAPI.parseRun) {
          await window.dbAPI.parseRun(currentRunId);
          loadData();
        }
      });
    }
  }

  window.NRDPages['run-detail'] = {
    title: 'Mission Control',

    render(params = {}) {
      currentRunId = Number(params.id) || null;
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-run-detail';

      el.innerHTML = `
        <div id="run-detail-container" class="run-detail-container">
          <div class="panel empty">
            <div class="spinner"></div>
            <p style="margin-top:12px;color:var(--text-dim)">Loading Mission Control for Run #${currentRunId}…</p>
          </div>
        </div>
      `;

      return el;
    },

    mounted(params = {}) {
      currentRunId = Number(params.id) || currentRunId;
      loadData();

      // Subscribe to real-time events
      if (window.engineAPI) {
        if (window.engineAPI.onRunStatus) {
          unsubRunStatus = window.engineAPI.onRunStatus(() => loadData());
        }
        if (window.engineAPI.onAgentStatus) {
          unsubAgentStatus = window.engineAPI.onAgentStatus(() => loadData());
        }
      }

      // Refresh every 2s while open
      refreshTimer = setInterval(() => {
        loadData();
      }, 2000);
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
