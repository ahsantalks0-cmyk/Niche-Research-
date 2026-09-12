'use strict';

/**
 * NRD · pages/dashboard.js — NOIR ATELIER dashboard.
 * Ledger-strip KPIs, copper charts, agent rail with LED indicators.
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  const KPIS = [
    { id: 'niches', label: 'Niches Researched', value: 0, delta: '0 in database', spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { id: 'runs', label: 'Active Runs', value: 0, delta: '0 in database', spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { id: 'reports', label: 'Reports Generated', value: 0, delta: '0 in database', spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { id: 'countries', label: 'Countries Covered', value: 0, delta: '30 seeded', spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30] },
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
    title: 'Studio',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-dashboard';

      const kpiCells = KPIS.map((k) => `
        <div class="led-cell" id="kpi-${k.id}">
          <div class="lc-label">${k.label}</div>
          <div class="lc-value hero-num" data-value="${k.value}">0</div>
          <div class="lc-foot">
            <span class="lc-delta up">${k.delta}</span>
            <canvas height="26"></canvas>
          </div>
        </div>`).join('');

      const runRows = RUNS.map(([id, niche, mode, agents, when, st, label]) => `
        <tr>
          <td class="td-strong">${id}</td>
          <td>${niche}</td>
          <td>${mode}</td>
          <td class="td-mut">${agents}</td>
          <td class="td-mut">${when}</td>
          <td><span class="pill pill-${st}"><span class="pdot"></span>${label}</span></td>
        </tr>`).join('');

      const agentCols = LAYERS.map((layer, li) => `
        <div class="agent-col">
          <div class="ac-head">
            <span class="ac-name">${layer.name}</span>
            <span class="ac-count">${layer.agents.length}</span>
          </div>
          <ul>
            ${layer.agents.map((name, i) => {
              const st = this._statusFor(li, i);
              const led = st === 'Active' ? 'on' : st === 'Done' ? 'fin' : '';
              return `<li><span class="led ${led}"></span><span title="${name} Agent">${name}</span><span>${st}</span></li>`;
            }).join('')}
          </ul>
        </div>`).join('');

      el.innerHTML = `
        <div class="page-head">
          <div>
            <h2>Morning briefing</h2>
            <div class="ph-sub">The department status at a glance — agents, runs, and coverage.</div>
          </div>
          <button class="btn btn-cu" data-goto="research">${NRDIcons.get('play')} New Research</button>
        </div>

        <div class="ledger-strip">${kpiCells}</div>

        <div class="dash-row">
          <div class="panel panel-hero">
            <div class="panel-head">
              <div>
                <h3>Research Activity</h3>
                <div class="ph-sub">Niches validated per day · last 14 days</div>
              </div>
              <span class="badge badge-active"><span class="bdot"></span>Live</span>
            </div>
            <div class="chart-box"><canvas id="chart-activity"></canvas></div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>Business Modes</h3>
                <div class="ph-sub">Share of validated niches</div>
              </div>
            </div>
            <div class="donut-flex">
              <div class="donut-wrap"><canvas id="chart-modes"></canvas></div>
              <div id="modes-legend" class="legend-rows"></div>
            </div>
          </div>
        </div>

        <div class="dash-row-2">
          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>Competition by Country</h3>
                <div class="ph-sub">Average difficulty · 0–100</div>
              </div>
            </div>
            <div class="chart-box"><canvas id="chart-competition"></canvas></div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>Recent Research Runs</h3>
                <div class="ph-sub">Latest agent swarm executions</div>
              </div>
            </div>
            <div style="padding: 14px 0 20px">
              <div class="ledger" style="border:none; box-shadow:none; background:transparent">
                <table class="led-table">
                  <thead>
                    <tr><th>Run</th><th>Niche</th><th>Mode</th><th>Agents</th><th>Started</th><th>Status</th></tr>
                  </thead>
                  <tbody>${runRows}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="panel agents-panel">
          <div class="panel-head">
            <div>
              <h3>Agent Department</h3>
              <div class="ph-sub">35 specialists · 5 layers · one shared approval gate</div>
            </div>
            <span class="badge badge-active"><span class="bdot"></span>3 active</span>
          </div>
          <div class="agent-rail">${agentCols}</div>
        </div>
      `;
      return el;
    },

    _statusFor(layerIdx, i) {
      let s = (layerIdx * 7 + i * 13 + 5) % 10;
      if (layerIdx === 0) return s > 4 ? 'Active' : 'Idle';
      if (layerIdx === 1) return s > 6 ? 'Active' : s > 2 ? 'Idle' : 'Done';
      return s > 7 ? 'Done' : 'Idle';
    },

    mounted() {
      this._charts = [];

      const countUp = (elNode, target) => {
        if (document.body.classList.contains('reduce-motion')) {
          elNode.textContent = NRDUI.fmtNum(target);
          return;
        }
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / 750);
          elNode.textContent = NRDUI.fmtNum(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };

      const animateKpis = (counts) => {
        const kpiMap = {
          niches: { val: counts ? counts.niches : 0, delta: counts && counts.niches > 0 ? `+${counts.niches} total` : '0 in database' },
          runs: { val: counts ? counts.runs : 0, delta: counts && counts.runs > 0 ? `${counts.runs} executed` : '0 in database' },
          reports: { val: counts ? counts.reports : 0, delta: counts && counts.reports > 0 ? `${counts.reports} ready` : '0 in database' },
          countries: { val: counts ? counts.countries : 30, delta: counts && counts.countries > 0 ? `${counts.countries} active` : '30 seeded' },
        };

        KPIS.forEach((k) => {
          const cell = document.getElementById(`kpi-${k.id}`);
          if (cell) {
            const data = kpiMap[k.id] || { val: 0, delta: '0 in database' };
            countUp(cell.querySelector('.lc-value'), data.val);
            const deltaEl = cell.querySelector('.lc-delta');
            if (deltaEl) deltaEl.textContent = data.delta;
          }
        });
      };

      if (window.dbAPI && typeof window.dbAPI.getCounts === 'function') {
        window.dbAPI.getCounts().then((counts) => {
          animateKpis(counts);
        }).catch(() => {
          animateKpis(null);
        });
      } else {
        animateKpis(null);
      }

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
          const cell = document.getElementById(`kpi-${k.id}`);
          if (cell) this._charts.push(NRDUI.sparkline(cell.querySelector('canvas'), k.spark));
        });
        this._charts.push(NRDUI.lineChart(
          document.getElementById('chart-activity'), ...this._chartData.activity));
        this._charts.push(NRDUI.donutChart(
          document.getElementById('chart-modes'), ...this._chartData.modes));
        this._charts.push(NRDUI.barChart(
          document.getElementById('chart-competition'), ...this._chartData.competition));
        this._renderLegend();
      };

      buildCharts();
      this._unTheme = NRDTheme.onChange(buildCharts);
    },

    _renderLegend() {
      const legend = document.getElementById('modes-legend');
      if (!legend) return;
      const [labels, data] = this._chartData.modes;
      const p = NRDUI.chartPalette();
      legend.innerHTML = labels.map((l, i) => `
        <div class="lr-row">
          <span class="lr-swatch" style="background:${p.ramp[i % p.ramp.length]}"></span>
          <span class="lr-name">${l}</span>
          <span class="lr-val">${data[i]}%</span>
        </div>`).join('');
    },

    destroy() {
      if (this._unTheme) this._unTheme();
      (this._charts || []).forEach((c) => { try { c.destroy(); } catch { /* noop */ } });
      this._charts = [];
    },
  };
})();
