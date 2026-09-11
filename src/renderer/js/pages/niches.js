'use strict';

/**
 * NRD · pages/niches.js — Niches library (Phase 0 empty state).
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  window.NRDPages.niches = {
    title: 'Niches',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-niches';

      el.innerHTML = `
        <div class="toolbar">
          <div class="input ph-input">
            ${NRDIcons.get('search')} <span style="font-size:13px">Search niches…</span>
          </div>
          <button class="btn btn-outline ph">
            ${NRDIcons.get('filter')} All modes
          </button>
          <div class="spacer"></div>
          <button class="btn btn-outline ph">
            ${NRDIcons.get('sort')} Newest first
          </button>
        </div>

        <div class="card">
          <div class="empty">
            <div class="e-icon">${NRDIcons.get('compass')}</div>
            <h3>No niches yet — run your first research</h3>
            <p>
              Once the agent swarm completes a research run, every discovered niche with its
              scores, competition and monetization data will appear here.
            </p>
            <button class="btn btn-gold" data-goto="research">
              ${NRDIcons.get('play')} Start your first research
            </button>
          </div>
        </div>
      `;
      return el;
    },

    mounted() { /* empty state — no behavior yet */ },
    destroy() { /* no charts */ },
  };
})();
