'use strict';

/**
 * NRD · pages/research.js — New Research (v2, Graphite & Champagne).
 * Discovery / Own Niche / Own Domain, business-mode multi-select,
 * country chips, run summary, disabled Start Research (Phase 1+).
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  const INPUT_MODES = [
    { id: 'discovery', title: 'Discovery', desc: 'Agents scan the web and surface fresh niche candidates automatically.' },
    { id: 'own-niche', title: 'Own Niche', desc: 'Bring a niche idea — the department researches and validates it.' },
    { id: 'own-domain', title: 'Own Domain', desc: 'Analyze an existing website and find adjacent growth niches.' },
  ];

  const BIZ_MODES = [
    { id: 'blogging', title: 'Blogging / AdSense', desc: 'Content sites monetized with display ads' },
    { id: 'affiliate', title: 'Affiliate', desc: 'Commission-based product recommendations' },
    { id: 'ecommerce', title: 'E-commerce', desc: 'Product listings and storefront opportunities' },
    { id: 'digital', title: 'Digital Products', desc: 'Courses, templates, downloads, SaaS' },
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

      const modeCards = INPUT_MODES.map((m, i) => `
        <button class="mode-card ${i === 0 ? 'selected' : ''}" data-mode="${m.id}" type="button">
          <span class="mc-check">${NRDIcons.get('check')}</span>
          <h4>${m.title}</h4>
          <p>${m.desc}</p>
        </button>`).join('');

      const bizCards = BIZ_MODES.map((m) => `
        <button class="biz-card" data-biz="${m.id}" type="button">
          <div><h5>${m.title}</h5><p>${m.desc}</p></div>
          <span class="bc-check">${NRDIcons.get('check')}</span>
        </button>`).join('');

      const chips = COUNTRIES.map((c) => `
        <button class="chip" data-code="${c.code}" type="button" title="${c.name}">
          <span class="c-flag">${c.flag}</span>${c.name}
        </button>`).join('');

      el.innerHTML = `
        <div class="nr-grid">
          <div style="display:flex; flex-direction:column; gap:14px">
            <div class="card card-pad">
              <div class="section-label">Input Mode</div>
              <div class="mode-cards">${modeCards}</div>
            </div>

            <div class="card card-pad">
              <div class="section-label">Business Modes</div>
              <div class="biz-cards">${bizCards}</div>
            </div>

            <div class="card card-pad">
              <div class="section-label">Countries</div>
              <div class="chip-row">${chips}</div>
            </div>
          </div>

          <div class="nr-start">
            <div class="card card-pad">
              <div class="section-label">Run Summary</div>

              <div class="field" style="margin-bottom:14px">
                <label for="qty-niches">Niches to research</label>
                <input class="input" id="qty-niches" type="number" min="1" max="50" value="5" />
              </div>

              <div class="est"><span>Input mode</span><b id="est-mode">Discovery</b></div>
              <div class="est"><span>Business modes</span><b id="est-biz">None selected</b></div>
              <div class="est"><span>Countries</span><b id="est-countries">2 selected</b></div>
              <div class="est"><span>Agents engaged</span><b id="est-agents">—</b></div>
              <div class="est"><span>Est. duration</span><b id="est-time">—</b></div>

              <button class="btn btn-gold btn-lg btn-block tt" id="btn-start" data-tip="Agents coming in Phase 1+"
                      disabled style="margin-top:20px">
                Start Research
              </button>
              <p class="text-faint" style="font-size:11.5px; text-align:center; margin-top:12px; line-height:1.55">
                The 35-agent swarm activates in Phase 1.<br/>Your configuration is saved.
              </p>
            </div>

            <div class="card card-pad" style="margin-top:14px">
              <div class="kv-row">
                <span class="kv-k">Approval Gate</span>
                <span class="kv-v" style="color: var(--gold)">Armed</span>
              </div>
              <div class="kv-row">
                <span class="kv-k">Every action requires</span>
                <span class="kv-v">Your approval</span>
              </div>
              <div class="kv-row">
                <span class="kv-k">Change later in</span>
                <span class="kv-v">Settings</span>
              </div>
            </div>
          </div>
        </div>
      `;
      return el;
    },

    mounted() {
      const state = { mode: 'discovery', biz: new Set(), countries: new Set(['US', 'UK']) };

      const refresh = () => {
        const mode = INPUT_MODES.find((m) => m.id === state.mode);
        document.getElementById('est-mode').textContent = mode ? mode.title : '—';
        document.getElementById('est-biz').textContent =
          state.biz.size === 0 ? 'None selected'
            : [...state.biz].map((id) => BIZ_MODES.find((b) => b.id === id).title).join(', ');
        document.getElementById('est-countries').textContent = `${state.countries.size} selected`;
        const qty = parseInt(document.getElementById('qty-niches').value, 10) || 0;
        document.getElementById('est-agents').textContent =
          state.biz.size && state.countries.size ? `≈ ${Math.min(35, 8 + qty * 2 + state.biz.size * 2)} of 35` : '—';
        document.getElementById('est-time').textContent =
          state.biz.size && state.countries.size ? `≈ ${Math.max(8, qty * 6)}–${Math.max(14, qty * 9)} min` : '—';
      };

      document.querySelectorAll('#mode-cards .mode-card, .mode-cards .mode-card').forEach((card) => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.mode-card').forEach((c) => c.classList.remove('selected'));
          card.classList.add('selected');
          state.mode = card.dataset.mode;
          refresh();
        });
      });

      document.querySelectorAll('.biz-card').forEach((card) => {
        card.addEventListener('click', () => {
          const id = card.dataset.biz;
          if (state.biz.has(id)) { state.biz.delete(id); card.classList.remove('selected'); }
          else { state.biz.add(id); card.classList.add('selected'); }
          refresh();
        });
      });

      document.querySelectorAll('.chip').forEach((chip) => {
        const code = chip.dataset.code;
        if (state.countries.has(code)) chip.classList.add('selected');
        chip.addEventListener('click', () => {
          if (state.countries.has(code)) { state.countries.delete(code); chip.classList.remove('selected'); }
          else { state.countries.add(code); chip.classList.add('selected'); }
          refresh();
        });
      });

      document.getElementById('qty-niches').addEventListener('input', refresh);

      document.getElementById('btn-start').addEventListener('click', (e) => e.preventDefault());

      refresh();
    },

    destroy() { /* no charts */ },
  };
})();
