'use strict';

/**
 * NRD · pages/research.js — New Research input page (Phase 0 placeholders).
 * Discovery / Own Niche / Own Domain modes, 4 business-mode multi-select,
 * quantity, country multi-select, disabled Start Research button.
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  const INPUT_MODES = [
    { id: 'discovery', icon: 'compass', title: 'Discovery', desc: 'Agents scan the web and surface fresh niche candidates automatically.' },
    { id: 'own-niche', icon: 'star', title: 'Own Niche', desc: 'Bring a niche idea — the department deep-researches and validates it.' },
    { id: 'own-domain', icon: 'globe', title: 'Own Domain', desc: 'Analyze an existing website and find adjacent growth niches.' },
  ];

  const BIZ_MODES = [
    { id: 'blogging', icon: 'pen', title: 'Blogging / AdSense', desc: 'Content sites monetized with display ads' },
    { id: 'affiliate', icon: 'coins', title: 'Affiliate', desc: 'Commission-based product recommendations' },
    { id: 'ecommerce', icon: 'cart', title: 'E-commerce', desc: 'Product listings and storefront opportunities' },
    { id: 'digital', icon: 'box', title: 'Digital Products', desc: 'Courses, templates, downloads, SaaS' },
  ];

  const COUNTRIES = [
    { code: 'US', flag: '🇺🇸', name: 'United States' },
    { code: 'UK', flag: '🇬🇧', name: 'United Kingdom' },
    { code: 'CA', flag: '🇨🇦', name: 'Canada' },
    { code: 'AU', flag: '🇦🇺', name: 'Australia' },
    { code: 'DE', flag: '🇩🇪', name: 'Germany' },
    { code: 'AE', flag: '🇦🇪', name: 'United Arab Emirates' },
  ];

  window.NRDPages.research = {
    title: 'New Research',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-research';
      el.innerHTML = `
        <div class="nr-grid">
          <div style="display:flex; flex-direction:column; gap:18px">
            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:16px">
                <h2>Input Mode</h2>
                <p>Choose how the department should source your research targets.</p>
              </div>
              <div class="mode-cards" id="mode-cards">
                ${INPUT_MODES.map((m, i) => `
                  <button class="mode-card ${i === 0 ? 'selected' : ''}" data-mode="${m.id}" type="button">
                    <span class="mc-check">${NRDIcons.get('check')}</span>
                    <div class="mc-ic">${NRDIcons.get(m.icon)}</div>
                    <h4>${m.title}</h4>
                    <p>${m.desc}</p>
                  </button>`).join('')}
              </div>
            </div>

            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:16px">
                <h2>Business Modes</h2>
                <p>Select one or more monetization models to evaluate.</p>
              </div>
              <div class="biz-cards" id="biz-cards">
                ${BIZ_MODES.map((m) => `
                  <button class="biz-card" data-biz="${m.id}" type="button">
                    <div class="bc-ic">${NRDIcons.get(m.icon)}</div>
                    <div><h5>${m.title}</h5><p>${m.desc}</p></div>
                    <span class="bc-check">${NRDIcons.get('check')}</span>
                  </button>`).join('')}
              </div>
            </div>

            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:16px">
                <h2>Countries</h2>
                <p>Markets the agents should investigate.</p>
              </div>
              <div class="chip-row" id="country-chips">
                ${COUNTRIES.map((c) => `
                  <button class="chip" data-code="${c.code}" type="button" title="${c.name}">
                    <span class="c-flag">${c.flag}</span>${c.name}
                  </button>`).join('')}
              </div>
            </div>
          </div>

          <div class="nr-start">
            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:14px">
                <h2>Run Summary</h2>
                <p>Live estimate of the upcoming agent deployment.</p>
              </div>

              <div class="field" style="margin-bottom:18px">
                <label for="qty-niches">Niches to research</label>
                <input class="input" id="qty-niches" type="number" min="1" max="50" value="5" />
              </div>

              <div class="est"><span>Input mode</span><b id="est-mode">Discovery</b></div>
              <div class="est"><span>Business modes</span><b id="est-biz">None selected</b></div>
              <div class="est"><span>Countries</span><b id="est-countries">0 selected</b></div>
              <div class="est"><span>Agents engaged</span><b id="est-agents">—</b></div>
              <div class="est"><span>Est. duration</span><b id="est-time">—</b></div>

              <button class="btn btn-gold btn-lg btn-block tt" id="btn-start" data-tip="Agents coming in Phase 1+"
                      disabled style="margin-top:22px">
                ${NRDIcons.get('play')} Start Research
              </button>
              <p class="text-faint" style="font-size:11.5px; text-align:center; margin-top:12px">
                The 35-agent swarm activates in Phase 1. Everything you configure here is saved.
              </p>
            </div>

            <div class="card card-pad" style="margin-top:18px">
              <div style="display:flex; gap:12px; align-items:flex-start">
                <div class="kpi-ic" style="width:34px; height:34px; flex:0 0 34px">${NRDIcons.get('shield')}</div>
                <div>
                  <div style="font-weight:600; font-size:13.5px">Approval Gate armed</div>
                  <p class="text-muted" style="font-size:12px; margin-top:2px">
                    Every agent action will require your approval before execution. You can change this in Settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      return el;
    },

    mounted() {
      const state = { mode: 'discovery', biz: new Set(), countries: new Set(['US', 'UK']) };

      const modeCards = el => document.querySelectorAll('#mode-cards .mode-card');
      const bizCards = document.querySelectorAll('#biz-cards .biz-card');
      const chips = document.querySelectorAll('#country-chips .chip');

      const refresh = () => {
        const mode = INPUT_MODES.find((m) => m.id === state.mode);
        document.getElementById('est-mode').textContent = mode ? mode.title : '—';
        document.getElementById('est-biz').textContent =
          state.biz.size === 0 ? 'None selected' : [...state.biz].map((id) => BIZ_MODES.find((b) => b.id === id).title).join(', ');
        document.getElementById('est-countries').textContent = `${state.countries.size} selected`;
        const qty = parseInt(document.getElementById('qty-niches').value, 10) || 0;
        document.getElementById('est-agents').textContent =
          state.biz.size && state.countries.size ? `≈ ${Math.min(35, 8 + qty * 2 + state.biz.size * 2)} of 35` : '—';
        document.getElementById('est-time').textContent =
          state.biz.size && state.countries.size ? `≈ ${Math.max(8, qty * 6)}–${Math.max(14, qty * 9)} min` : '—';
      };

      document.querySelectorAll('#mode-cards .mode-card').forEach((card) => {
        card.addEventListener('click', () => {
          document.querySelectorAll('#mode-cards .mode-card').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          state.mode = card.dataset.mode;
          refresh();
        });
      });

      bizCards.forEach((card) => {
        card.addEventListener('click', () => {
          const id = card.dataset.biz;
          if (state.biz.has(id)) { state.biz.delete(id); card.classList.remove('selected'); }
          else { state.biz.add(id); card.classList.add('selected'); }
          refresh();
        });
      });

      chips.forEach((chip) => {
        const code = chip.dataset.code;
        if (state.countries.has(code)) chip.classList.add('selected');
        chip.addEventListener('click', () => {
          if (state.countries.has(code)) { state.countries.delete(code); chip.classList.remove('selected'); }
          else { state.countries.add(code); chip.classList.add('selected'); }
          refresh();
        });
      });

      document.getElementById('qty-niches').addEventListener('input', refresh);

      // disabled button shows the tooltip on hover (CSS) — also guard clicks
      document.getElementById('btn-start').addEventListener('click', (e) => {
        e.preventDefault();
      });

      refresh();
    },

    destroy() { /* no charts */ },
  };
})();
