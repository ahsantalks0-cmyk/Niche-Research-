'use strict';

/**
 * NRD · pages/dashboard.js — the star of the show.
 * 4 animated KPI cards with sparklines, line/donut/bar charts (theme-aware),
 * 35-agent roster grouped by layer, recent runs table.
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  window.NRDPages.dashboard = {
    title: 'Dashboard',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-dashboard';
      el.innerHTML = `
        <div class="dash-grid">
          <div class="card card-hover kpi" id="kpi-niches">
            <div class="kpi-top">
              <div>
                <div class="kpi-label">Total Niches Researched</div>
                <div class="kpi-value" data-count="0">0</div>
              </div>
              <div class="kpi-ic">${NRDIcons.get('compass')}</div>
            </div>
            <canvas height="36"></canvas>
            <div class="kpi-delta up">${NRDIcons.get('trend')} +12.4% this month</div>
          </div>

          <div class="card card-hover kpi" id="kpi-runs">
            <div class="kpi-top">
              <div>
                <div class="kpi-label">Active Runs</div>
                <div class="kpi-value" data-count="0">0</div>
              </div>
              <div class="kpi-ic" style="color: var(--teal); background: rgba(56,199,184,0.12)">${NRDIcons.get('play')}</div>
            </div>
            <canvas height="36"></canvas>
            <div class="kpi-delta up">${NRDIcons.get('trend')} +3 today</div>
          </div>

          <div class="card card-hover kpi" id="kpi-reports">
            <div class="kpi-top">
              <div>
                <div class="kpi-label">Reports Generated</div>
                <div class="kpi-value" data-count="0">0</div>
              </div>
              <div class="kpi-ic">${NRDIcons.get('doc')}</div>
            </div>
            <canvas height="36"></canvas>
            <div class="kpi-delta up">${NRDIcons.get('trend')} +8 this week</div>
          </div>

          <div class="card card-hover kpi" id="kpi-countries">
            <div class="kpi-top">
              <div>
                <div class="kpi-label">Countries Covered</div>
                <div class="kpi-value" data-count="0">0</div>
              </div>
              <div class="kpi-ic" style="color: var(--teal); background: rgba(56,199,184,0.12)">${NRDIcons.get('globe')}</div>
            </div>
            <canvas height="36"></canvas>
            <div class="kpi-delta up">${NRDIcons.get('trend')} +2 new</div>
          </div>
        </div>

        <div class="dash-row">
          <div class="card card-glass">
            <div class="card-head">
              <div>
                <h3>Research Activity</h3>
                <div class="card-sub">Niches validated per day · last 14 days</div>
              </div>
              <span class="badge badge-done"><span class="bdot"></span>LIVE</span>
            </div>
            <div class="chart-box"><canvas id="chart-activity"></canvas></div>
          </div>

          <div class="card card-glass">
            <div class="card-head">
              <div>
                <h3>Niches by Business Mode</h3>
                <div class="card-sub">Distribution across monetization models</div>
              </div>
            </div>
            <div class="chart-box"><canvas id="chart-modes"></canvas></div>
          </div>
        </div>

        <div class="dash-row-2">
          <div class="card card-glass">
            <div class="card-head">
              <div>
                <h3>Competition Levels by Country</h3>
                <div class="card-sub">Average difficulty score · 0–100</div>
              </div>
            </div>
            <div class="chart-box"><canvas id="chart-competition"></canvas></div>
          </div>

          <div class="card card-glass">
            <div class="card-head">
              <div>
                <h3>Recent Research Runs</h3>
                <div class="card-sub">Latest agent swarm executions</div>
              </div>
              <button class="btn btn-ghost" data-goto="research" style="height:32px; padding:0 12px; font-size:12px">New Run</button>
            </div>
            <div style="padding: 14px 0 8px"></div>
            <div class="table-wrap" style="border:none; box-shadow:none; border-radius:0">
              <table class="nrd-table">
                <thead>
                  <tr><th>Run</th><th>Niche</th><th>Mode</th><th>Agents</th><th>Started</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="td-strong">#RUN-1042</td><td>AI productivity tools</td><td>Affiliate</td>
                    <td class="td-muted">12 of 35</td><td class="td-muted">Sep 11 · 09:41</td>
                    <td><span class="pill pill-running"><span class="bdot"></span>Running</span></td>
                  </tr>
                  <tr>
                    <td class="td-strong">#RUN-1041</td><td>Home coffee brewing</td><td>Blogging / AdSense</td>
                    <td class="td-muted">35 of 35</td><td class="td-muted">Sep 10 · 22:03</td>
                    <td><span class="pill pill-complete"><span class="bdot"></span>Complete</span></td>
                  </tr>
                  <tr>
                    <td class="td-strong">#RUN-1040</td><td>Minimalist desk setups</td><td>E-commerce</td>
                    <td class="td-muted">35 of 35</td><td class="td-muted">Sep 10 · 14:26</td>
                    <td><span class="pill pill-complete"><span class="bdot"></span>Complete</span></td>
                  </tr>
                  <tr>
                    <td class="td-strong">#RUN-1039</td><td>AI side hustles</td><td>Digital Products</td>
                    <td class="td-muted">8 of 35</td><td class="td-muted">Sep 10 · 11:52</td>
                    <td><span class="pill pill-queued"><span class="bdot"></span>Queued</span></td>
                  </tr>
                  <tr>
                    <td class="td-strong">#RUN-1038</td><td>Pet nutrition trends</td><td>Affiliate</td>
                    <td class="td-muted">35 of 35</td><td class="td-muted">Sep 09 · 19:10</td>
                    <td><span class="pill pill-failed"><span class="bdot"></span>Failed</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card agents-panel">
          <div class="card-head">
            <div>
              <h3>Active Agents</h3>
              <div class="card-sub">35-specialist roster across 5 layers of the research swarm</div>
            </div>
            <span class="badge badge-active"><span class="bdot"></span>3 ACTIVE</span>
          </div>
          <div class="agent-groups" id="agent-groups"></div>
        </div>
      `;
      return el;
    },

    mounted() {
      /* ---- KPI counters (run once) ---- */
      const kpis = [
        { id: 'kpi-niches', value: 1284 },
        { id: 'kpi-runs', value: 4 },
        { id: 'kpi-reports', value: 342 },
        { id: 'kpi-countries', value: 26 },
      ];
      kpis.forEach(({ id, value }) => {
        const card = document.getElementById(id);
        if (!card) return;
        NRDUI.animateCounter(card.querySelector('.kpi-value'), value);
      });

      /* ---- charts (rebuilt on theme change) ---- */
      this._charts = [];
      this._sparkData = {
        'kpi-niches': [8, 12, 10, 16, 14, 22, 19, 26, 24, 32, 30, 38],
        'kpi-runs': [2, 3, 2, 4, 3, 5, 4, 3, 4, 6, 5, 4],
        'kpi-reports': [4, 6, 5, 9, 8, 12, 10, 14, 13, 17, 16, 21],
        'kpi-countries': [10, 12, 11, 14, 16, 15, 18, 20, 19, 22, 24, 26],
      };

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
        Object.entries(this._sparkData).forEach(([kpiId, spark]) => {
          const card = document.getElementById(kpiId);
          if (card) this._charts.push(NRDUI.sparkline(card.querySelector('canvas'), spark));
        });
        this._charts.push(NRDUI.lineChart(
          document.getElementById('chart-activity'), ...this._chartData.activity));
        this._charts.push(NRDUI.donutChart(
          document.getElementById('chart-modes'), ...this._chartData.modes));
        this._charts.push(NRDUI.barChart(
          document.getElementById('chart-competition'), ...this._chartData.competition));
      };

      buildCharts();
      this._unTheme = NRDTheme.onChange(buildCharts);

      /* ---- 35-agent roster ---- */
      const layers = [
        { name: 'Control', agents: ['Coordinator', 'Scheduler', 'Resource Broker', 'Approval Gate'] },
        { name: 'Discovery', agents: ['Trend Scanner', 'SERP Cartographer', 'Forum Miner', 'Social Pulse', 'Competitor Sweep'] },
        { name: 'Deep Research', agents: ['Search Analyst', 'Content Auditor', 'Keyword Profiler', 'Backlink Recon', 'E-E-A-T Assessor', 'SERP Feature Analyst', 'Video Landscape', 'Audience Analyst', 'Market Sizing'] },
        { name: 'Intelligence', agents: ['Monetization Modeler', 'Affiliate Mapper', 'Product Sourcing', 'Ad Revenue Estimator', 'Competition Scorer', 'Demand Forecaster', 'Seasonality Analyst', 'Risk Assessor', 'Locale Strategist'] },
        { name: 'QA & Reporting', agents: ['Data Verifier', 'Fact Checker', 'Consistency Auditor', 'Report Composer', 'Insight Summarizer', 'Country Dossier', 'Niche Dossier', 'Export Steward'] },
      ];
      const statuses = ['Idle', 'Active', 'Done'];
      // deterministic pseudo-random placeholder states
      let seed = 7;
      const statusFor = (layerIdx, i) => {
        seed = (seed * 9301 + 49297) % 233280;
        const r = seed / 233280;
        if (layerIdx === 0) return r > 0.5 ? 'Active' : 'Idle';
        if (layerIdx === 1) return r > 0.7 ? 'Active' : r > 0.3 ? 'Idle' : 'Done';
        return r > 0.8 ? 'Done' : 'Idle';
      };

      const wrap = document.getElementById('agent-groups');
      layers.forEach((layer, li) => {
        const group = document.createElement('div');
        group.className = 'agent-group';
        group.innerHTML = `
          <div class="ag-head">
            <span class="ag-name">${layer.name}</span>
            <span class="ag-count">${layer.agents.length} agents</span>
          </div>
          <ul></ul>`;
        const ul = group.querySelector('ul');
        layer.agents.forEach((name, i) => {
          const st = statusFor(li, i);
          const liEl = document.createElement('li');
          liEl.innerHTML = `
            <span title="${name} Agent">${name}</span>
            <span class="badge badge-${st.toLowerCase()}"><span class="bdot"></span>${st}</span>`;
          ul.appendChild(liEl);
        });
        wrap.appendChild(group);
      });
    },

    destroy() {
      if (this._unTheme) this._unTheme();
      (this._charts || []).forEach((c) => { try { c.destroy(); } catch { /* noop */ } });
      this._charts = [];
    },
  };
})();
