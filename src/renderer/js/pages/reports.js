'use strict';

/**
 * NRD · pages/reports.js — Reports library (Phase 0 empty state + skeletons).
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  window.NRDPages.reports = {
    title: 'Reports',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-reports';

      el.innerHTML = `
        <div class="toolbar">
          <button class="btn btn-outline ph">
            ${NRDIcons.get('filter')} All reports
          </button>
          <div class="spacer"></div>
          <button class="btn btn-outline ph">
            ${NRDIcons.get('download')} Export
          </button>
        </div>

        <div class="report-grid" id="report-skeletons" aria-hidden="true">
          <div class="skeleton report-skel"></div>
          <div class="skeleton report-skel"></div>
          <div class="skeleton report-skel"></div>
        </div>

        <div class="card" style="margin-top:18px">
          <div class="empty">
            <div class="e-icon">${NRDIcons.get('doc')}</div>
            <h3>No reports generated yet</h3>
            <p>
              Completed research runs are compiled into premium country and niche dossiers —
              ready to read, export and present. Your first report will land here.
            </p>
            <button class="btn btn-gold" data-goto="research">
              ${NRDIcons.get('play')} Run research to generate reports
            </button>
          </div>
        </div>
      `;
      return el;
    },

    mounted() { /* empty state */ },
    destroy() { /* no charts */ },
  };
})();
