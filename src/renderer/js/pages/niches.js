'use strict';

/**
 * NRD · pages/niches.js — Discovered Niches Library (Part B - Agent #6 & Agent #7)
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  let currentNichesList = [];

  const escapeHtml = (str) => {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const parseJsonSafe = (data, fallback = []) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  };

  const getVerdictBadgeHTML = (verdict) => {
    if (!verdict) return '';
    const v = String(verdict).toUpperCase();
    if (v === 'STRONG') {
      return `<span class="badge" style="background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(34,197,94,0.3); font-size:10px;">📈 STRONG DEMAND</span>`;
    }
    if (v === 'MODERATE') {
      return `<span class="badge" style="background:rgba(245,158,11,0.15); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); font-size:10px;">➡️ MODERATE DEMAND</span>`;
    }
    if (v === 'WEAK') {
      return `<span class="badge" style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3); font-size:10px;">📉 WEAK DEMAND</span>`;
    }
    return `<span class="badge" style="background:rgba(156,163,175,0.15); color:#9ca3af; border:1px solid rgba(156,163,175,0.3); font-size:10px;">❓ INSUFFICIENT DATA</span>`;
  };

  const goToDiscoveryRun = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (window.NRDApp && window.NRDApp.navigateTo) {
      window.NRDApp.navigateTo('research', { mode: 'discovery' });
    } else {
      location.hash = '#/research?mode=discovery';
    }
  };

  const renderNicheCards = (container, list = []) => {
    if (!container) return;
    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = `
        <div class="empty" style="grid-column: 1 / -1; padding: 40px 20px;">
          <div class="e-icon">${typeof NRDIcons !== 'undefined' ? NRDIcons.get('compass') : '🔍'}</div>
          <h3>No matching niches found</h3>
          <p>Start a new Discovery research run or adjust your search filters.</p>
          <button class="btn btn-cu" id="btn-niche-start-run" style="margin-top:12px">
            Start Discovery Run
          </button>
        </div>
      `;
      const btn = container.querySelector('#btn-niche-start-run');
      if (btn) {
        btn.addEventListener('click', goToDiscoveryRun);
      }
      return;
    }

    container.innerHTML = list.map((n) => {
      const modeFit = parseJsonSafe(n.mode_fit, ['blogging']);
      const countries = parseJsonSafe(n.countries, ['US']);
      const sourceLabels = {
        web_signal: '🌐 Web Signal',
        ai_expansion: '🧠 AI Expansion',
        user_provided: '🎯 Seed Niche',
        domain_inferred: '🔍 Domain Inferred',
      };
      const sourceTag = sourceLabels[n.source] || '🔍 Discovered';
      const demandBadge = getVerdictBadgeHTML(n.demand_verdict);
      const createdStr = n.created_at ? new Date(n.created_at.replace(' ', 'T') + 'Z').toLocaleDateString() : 'Recent';

      return `
        <div class="panel panel-pad niche-card" style="display:flex; flex-direction:column; justify-content:space-between; transition:border-color 0.15s ease; border:1px solid var(--border)">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:6px; flex-wrap:wrap">
              <span class="badge badge-active" style="font-size:10px; text-transform:uppercase">${escapeHtml(n.discovery_status || 'Discovered')}</span>
              ${demandBadge}
              <span class="badge badge-outline" style="font-size:10px">${sourceTag}</span>
            </div>

            <h3 style="font-size:14px; font-weight:600; color:var(--text-1); margin:0 0 6px 0">${escapeHtml(n.niche_name)}</h3>
            <div style="font-size:11.5px; color:var(--text-3); margin-bottom:10px; line-height:1.4">${escapeHtml(n.description || 'Discovered candidate niche.')}</div>

            ${n.signal_evidence ? `
              <div style="background:var(--ink-950, #09090b); border:1px solid var(--border); border-radius:6px; padding:6px 8px; margin-bottom:10px; font-size:10.5px; color:var(--text-2)">
                <strong style="color:var(--text-1); font-size:10px; display:block; margin-bottom:2px">GROUNDING EVIDENCE:</strong>
                <span style="font-family:var(--font-mono, monospace)">${escapeHtml(n.signal_evidence)}</span>
              </div>
            ` : ''}
          </div>

          <div>
            <div style="display:flex; wrap:wrap; gap:4px; margin-bottom:10px">
              ${modeFit.map((m) => `<span class="badge" style="font-size:9.5px; background:rgba(147,51,234,0.12); color:#c084fc; border:1px solid rgba(147,51,234,0.25)">${escapeHtml(m)}</span>`).join('')}
              ${countries.map((c) => `<span class="badge badge-outline" style="font-size:9.5px">${escapeHtml(c)}</span>`).join('')}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:8px; font-size:10.5px; color:var(--text-dim)">
              <span class="niche-run-link" data-runid="${n.run_id}" style="color:var(--text-1); text-decoration:underline; font-weight:600; cursor:pointer">Run #${n.run_id || '—'}</span>
              <span>${createdStr}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Delegate click handler for Run links
    container.addEventListener('click', (e) => {
      const link = e.target.closest('.niche-run-link');
      if (link && link.dataset.runid && link.dataset.runid !== '—') {
        e.preventDefault();
        if (window.NRDApp && window.NRDApp.navigateTo) {
          window.NRDApp.navigateTo('run-detail', { id: link.dataset.runid });
        } else {
          location.hash = `#/run-detail?id=${link.dataset.runid}`;
        }
      }
    });
  };

  window.NRDPages.niches = {
    title: 'Niches Library',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-niches';

      el.innerHTML = `
        <div class="page-head">
          <div>
            <h2>Niche Library</h2>
            <div class="ph-sub">Real discovered candidate niches & trend demand signals from Agent #6 & Agent #7.</div>
          </div>
          <button class="btn btn-cu" id="btn-niches-new-run">
            ${typeof NRDIcons !== 'undefined' ? NRDIcons.get('play') : '▶'} Start Discovery Run
          </button>
        </div>

        <div class="toolbar" style="margin-bottom:14px; gap:8px">
          <input class="input" id="niches-search-input" placeholder="Search discovered niches or evidence signals…" style="flex:1; font-size:12px" />
          
          <select class="select" id="niches-mode-filter" style="width:160px; font-size:12px">
            <option value="all">All Modes</option>
            <option value="blogging">Blogging</option>
            <option value="affiliate">Affiliate</option>
            <option value="ecommerce">E-Commerce</option>
            <option value="digital_products">Digital Products</option>
          </select>

          <button class="btn btn-outline" id="btn-refresh-niches" style="padding:4px 10px; font-size:12px">
            Refresh
          </button>
        </div>

        <div id="niches-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:12px">
          <div style="color:var(--text-dim); padding:20px; font-size:12px">Loading discovered niches from database…</div>
        </div>
      `;
      return el;
    },

    async mounted() {
      const searchInput = document.getElementById('niches-search-input');
      const modeSelect = document.getElementById('niches-mode-filter');
      const btnRefresh = document.getElementById('btn-refresh-niches');
      const btnNewRun = document.getElementById('btn-niches-new-run');
      const grid = document.getElementById('niches-grid');

      const filterAndRender = () => {
        if (!grid) return;
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const selectedMode = modeSelect ? modeSelect.value : 'all';

        const filtered = currentNichesList.filter((n) => {
          const matchQuery = !query ||
            (n.niche_name && n.niche_name.toLowerCase().includes(query)) ||
            (n.description && n.description.toLowerCase().includes(query)) ||
            (n.signal_evidence && n.signal_evidence.toLowerCase().includes(query));

          const modeFit = parseJsonSafe(n.mode_fit, []);
          const matchMode = selectedMode === 'all' || modeFit.includes(selectedMode);

          return matchQuery && matchMode;
        });

        renderNicheCards(grid, filtered);
      };

      const loadNiches = async () => {
        if (!window.dbAPI || !window.dbAPI.findBy) return;
        try {
          const rows = await window.dbAPI.findBy('niches', {}, { orderBy: 'id DESC' });
          currentNichesList = Array.isArray(rows) ? rows : [];
          filterAndRender();
        } catch (err) {
          if (grid) grid.innerHTML = `<div style="color:var(--text-danger, #f87171); padding:20px">Error loading niches: ${escapeHtml(err.message)}</div>`;
        }
      };

      if (searchInput) searchInput.addEventListener('input', filterAndRender);
      if (modeSelect) modeSelect.addEventListener('change', filterAndRender);
      if (btnRefresh) btnRefresh.addEventListener('click', loadNiches);
      if (btnNewRun) {
        btnNewRun.addEventListener('click', goToDiscoveryRun);
      }

      await loadNiches();
    },

    destroy() {},
  };
})();
