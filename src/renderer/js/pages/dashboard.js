'use strict';

/**
 * NRD · pages/dashboard.js — v2 (Graphite & Champagne).
 * Editorial KPI row, monochrome charts, hairline agent roster, calm status.
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  const KPIS = [
    { id: 'niches', label: 'Niches Researched', value: 1284, delta: '+12.4% this month', spark: [8, 12, 10, 16, 14, 22, 19, 26, 24, 32, 30, 38] },
    { id: 'runs', label: 'Active Runs', value: 4, delta: '+3 today', spark: [2, 3, 2, 4, 3, 5, 4, 3, 4, 6, 5, 4] },
    { id: 'reports', label: 'Reports Generated', value: 342, delta: '+8 this week', spark: [4, 6, 5, 9, 8, 12, 10, 14, 13, 17, 16, 21] },
    { id: 'countries', label: 'Countries Covered', value: 26, delta: '+2 new', spark: [10, 12, 11, 14, 16, 15, 18, 20, 19, 22, 24, 26] },
  ];

  const RUNS = [
    ['#RUN-1042', 'AI productivity tools', 'Affiliate', '12 of 35', 'Sep 11 · 09:41', 'running', 'Running'],
    ['#RUN-1041', 'Home coffee brewing', 'Blogging / AdSense', '35 of 35', 'Sep 10 · 22:03', 'complete', 'Complete'],
    ['#RUN-1040', 'Minimalist desk setups', 'E-commerce', '35 of 35', 'Sep 10 · 14:26', 'complete', 'Complete'],
    ['#RUN-1039', 'AI side hustles', 'Digital Products', '8 of 35', 'Sep 10 · 11:52', 'queued', 'Queued'],
    ['#RUN-1038', 'Pet nutrition trends', 'Affiliate', '35 of 35', 'Sep 09 · 19:10', 'failed', 'Failed'],
  ];

  const LAYERS = [
    { name: 'Control', agents: ['Coordinator', 'Scheduler', 'Resource Broker', 'Approval Gate'] },
    { name: 'Discovery', agents: ['Trend Scanner', 'SERP Cartographer', 'Forum Miner', 'Social Pulse', 'Competitor Sweep'] },
    { name: 'Deep Research', agents: ['Search Analyst', 'Content Auditor', 'Keyword Profiler', 'Backlink Recon', 'E-E-A-T Assessor', 'SERP Feature Analyst', 'Video Landscape', 'Audience Analyst', 'Market Sizing'] },
    { name: 'Intelligence', agents: ['Monetization Modeler', 'Affiliate Mapper', 'Product Sourcing', 'Ad Revenue Estimator', 'Competition Scorer', 'Demand Forecaster', 'Seasonality Analyst', 'Risk Assessor', 'Locale Strategist'] },
    { name: 'QA & Reporting', agents: ['Data Verifier', 'Fact Checker', 'Consistency Auditor', 'Report Composer', 'Insight Summarizer', 'Country Dossier', 'Niche Dossier', 'Export Steward'] },
  ];

  window.NRDPages.dashboard = {
    title: 'Dashboard',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-dashboard';

      const kpiCards = KPIS.map((k) => `
        <div class="card card-hover kpi" id="kpi-${k.id}">
          <div class="kpi-top">
            <div class="kpi-value hero-num" data-value="${k.value}">0</div>
          </div>
          <div class="kpi-label">${k.label}</div>
          <canvas height="34"></canvas>
          <div class="kpi-delta up">${k.delta}</div>
        </div>`).join('');

      const runRows = RUNS.map(([id, niche, mode, agents, when, st, label]) => `
        <tr>
          <td class="td-strong">${id}</td>
          <td>${niche}</td>
          <td>${mode}</td>
          <td class="td-muted">${agents}</td>
          <td class="td-muted">${when}</td>
          <td><span class="pill pill-${st}"><span class="pdot"></span>${label}</span></td>
        </tr>`).join('');

      const agentCols = LAYERS.map((layer, li) => `
        <div class="agent-group">
          <div class="ag-head">
            <span class="ag-name">${layer.name}</span>
            <span class="ag-count">${layer.agents.length}</span>
          </div>
          <ul>
            ${layer.agents.map((name, i) => {
              const st = this._statusFor(li, i);
              return `<li><span title="${name} Agent">${name}</span>
                <span class="badge badge-${st.toLowerCase()}"><span class="bdot"></span>${st}</span></li>`;
            }).join('')}
          </ul>
        </div>`).join('');

      el.innerHTML = `
        <div class="dash-grid">${kpiCards}</div>

        <div class="dash-row">
          <div class="card">
            <div class="card-head">
              <div>
                <h3>Research Activity</h3>
                <div class="card-sub">Niches validated per day · last 14 days</div>
              </div>
            </div>
            <div class="chart-box"><canvas id="chart-activity"></canvas></div>
          </div>

          <div class="card">
            <div class="card-head">
              <div>
                <h3>Business Modes</h3>
                <div class="card-sub">Share of validated niches</div>
              </div>
            </div>
            <div class="chart-box" style="display:grid; grid-template-rows:1fr auto">
              <canvas id="chart-modes"></canvas>
              <div id="modes-legend" class="modes-legend"></div>
            </div>
          </div>
        </div>

        <div class="dash-row-2">
          <div class="card">
            <div class="card-head">
              <div>
                <h3>Competition by Country</h3>
                <div class="card-sub">Average difficulty · 0–100</div>
              </div>
            </div>
            <div class="chart-box"><canvas id="chart-competition"></canvas></div>
          </div>

          <div class="card">
            <div class="card-head">
              <div>
                <h3>Recent Research Runs</h3>
                <div class="card-sub">Latest agent swarm executions</div>
              </div>
              <button class="btn btn-ghost" data-goto="research" style="height:30px; padding:0 10px; font-size:12px">New Run</button>
            </div>
            <div style="padding: 16px 24px 20px 0">
              <table class="nrd-table">
                <thead>
                  <tr><th>Run</th><th>Niche</th><th>Mode</th><th>Agents</th><th>Started</th><th>Status</th></tr>
                </thead>
                <tbody>${runRows}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card agents-panel">
          <div class="card-head">
            <div>
              <h3>Agent Department</h3>
              <div class="card-sub">35 specialists · 5 layers · one shared approval gate</div>
            </div>
            <span class="badge badge-active"><span class="bdot"></span>3 active</span>
          </div>
          <div class="agent-groups">${agentCols}</div>
        </div>
      `;
      return el;
    },

    _statusFor(layerIdx, i) {
      // deterministic placeholder states
      let s = (layerIdx * 7 + i * 13 + 5) % 10;
      if (layerIdx === 0) return s > 4 ? 'Active' : 'Idle';
      if (layerIdx === 1) return s > 6 ? 'Active' : s > 2 ? 'Idle' : 'Done';
      return s > 7 ? 'Done' : 'Idle';
    },

    mounted() {
      /* ---- KPI values: quiet count-up, then sparklines ---- */
      this._charts = [];

      const countUp = (elNode, target) => {
        const reduce = document.body.classList.contains('reduce-motion');
        if (reduce) { elNode.textContent = NRDUI.fmtNum(target); return; }
        const t0 = performance.now();
        const ms = 700;
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / ms);
          const eased = 1 - Math.pow(1 - p, 3);
          elNode.textContent = NRDUI.fmtNum(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };

      KPIS.forEach((k) => {
        const card = document.getElementById(`kpi-${k.id}`);
        if (!card) return;
        countUp(card.querySelector('.kpi-value'), k.value);
      });

      /* ---- charts, rebuilt on theme change ---- */
      const labels14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(Date.now() - (13 - i) * 86400000);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      this._chartData = {
        activity: [labels14, [12, 18, 9, 22, 30, 24, 36, 28, 44, 38, 52, 47, 61, 58]],
        modes: [['Blogging / AdSense', 'Affiliate', 'E-commerce', 'Digital Products'], [38, 31, 18, 13]],
        competition: [['USA', 'UK', 'Canada', 'Germany', 'Australia', 'UAE'], [78, 71, 64, 59, 55, 42]],
      };

      const buildCharts = () => {
        this._charts.forEach((c) => { try { c.destroy(); } catch { /* noop */ } });
        this._charts = [];
        KPIS.forEach((k) => {
          const card = document.getElementById(`kpi-${k.id}`);
          if (card) this._charts.push(NRDUI.sparkline(card.querySelector('canvas'), k.spark));
        });
        this._charts.push(NRDUI.lineChart(
          document.getElementById('chart-activity'), ...this._chartData.activity));
        this._charts.push(NRDUI.donutChart(
          document.getElementById('chart-modes'), ...this._chartData.modes));
        this._charts.push(NRDUI.barChart(
          document.getElementById('chart-competition'), ...this._chartData.competition));
        this._renderModesLegend();
      };

      buildCharts();
      this._unTheme = NRDTheme.onChange(buildCharts);
    },

    _renderModesLegend() {
      const legend = document.getElementById('modes-legend');
      if (!legend) return;
      const [labels, data] = this._chartData.modes;
      const p = NRDUI.chartPalette();
      legend.innerHTML = labels.map((l, i) => `
        <div class="ml-row">
          <span class="ml-swatch" style="background:${p.ramp[i % p.ramp.length]}"></span>
          <span class="ml-name">${l}</span>
          <span class="ml-val">${data[i]}%</span>
        </div>`).join('');
    },

    destroy() {
      if (this._unTheme) this._unTheme();
      (this._charts || []).forEach((c) => { try { c.destroy(); } catch { /* noop */ } });
      this._charts = [];
    },
  };
})();
