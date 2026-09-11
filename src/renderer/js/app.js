'use strict';

/**
 * NRD · app.js — SPA orchestrator: hash-based routing across the 6 pages,
 * frameless title-bar controls, sidebar collapse persistence, status bar,
 * boot sequence with the smooth open animation.
 */
(function () {
  let currentPage = null;
  let settings = {};
  let appInfo = { version: '', platform: '' };

  const $pages = () => document.getElementById('pages');

  /* --------------------------------- router --------------------------------- */

  function setPage(id) {
    if (!window.NRDPages || !window.NRDPages[id]) return false;
    if (currentPage === id) return true;

    if (currentPage && typeof window.NRDPages[currentPage].destroy === 'function') {
      window.NRDPages[currentPage].destroy();
    }

    currentPage = id;
    $pages().innerHTML = '';
    $pages().appendChild(window.NRDPages[id].render());

    document.getElementById('page-title').textContent = window.NRDPages[id].title || id;

    document.querySelectorAll('.nav-item').forEach((n) => {
      n.classList.toggle('active', n.dataset.page === id);
    });

    const want = `#/${id}`;
    if (location.hash !== want) location.hash = want;

    document.getElementById('main').scrollTop = 0;
    if (typeof window.NRDPages[id].mounted === 'function') window.NRDPages[id].mounted();
    return true;
  }

  function fromHash() {
    const id = (location.hash || '').replace(/^#\/?/, '') || 'dashboard';
    if (!setPage(id)) setPage('dashboard');
  }

  /* ------------------------------- title bar -------------------------------- */

  function wireTitleBar() {
    document.getElementById('win-min').addEventListener('click', () => window.nrd.minimize());
    document.getElementById('win-max').addEventListener('click', () => window.nrd.toggleMaximize());
    document.getElementById('win-close').addEventListener('click', () => window.nrd.closeWindow());
    document.getElementById('titlebar').addEventListener('dblclick', (e) => {
      if (e.target.closest('.tb-controls')) return;
      window.nrd.toggleMaximize();
    });

    const maxBtn = document.getElementById('win-max');
    const setMaxIcon = (maximized) => {
      maxBtn.innerHTML = maximized
        ? '<svg viewBox="0 0 12 12" width="12" height="12"><rect x="1" y="3.2" width="7.2" height="7.2" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M3.6 1.2h7v7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 12 12" width="12" height="12"><rect x="1.8" y="1.8" width="8.4" height="8.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
      maxBtn.title = maximized ? 'Restore' : 'Maximize';
    };
    setMaxIcon(!!appInfo.maximized);
    window.nrd.onWindowFlags((flags) => setMaxIcon(!!flags.maximized));
  }

  /* --------------------------------- sidebar --------------------------------- */

  function wireSidebar() {
    document.getElementById('btn-collapse').addEventListener('click', () => {
      const collapsed = !document.body.classList.contains('sidebar-collapsed');
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      window.nrd.setSettings({ sidebarCollapsed: collapsed });
    });

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => { location.hash = `/${item.dataset.page}`; });
    });

    document.getElementById('side-profile').addEventListener('click', () => {
      window.NRDToast.show({
        type: 'info',
        title: 'Research Director',
        msg: 'Team profiles and permissions arrive with multi-user support.',
      });
    });
  }

  /* ---------------------------------- topbar ---------------------------------- */

  function wireTopbar() {
    // data-goto delegation (settings icon, page CTA buttons)
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) {
        location.hash = `/${go.dataset.goto}`;
        return;
      }
      // empty-state "disabled placeholder" controls give gentle feedback
      const ph = e.target.closest('.toolbar .btn.ph, .toolbar .ph-input');
      if (ph) {
        window.NRDToast.show({
          type: 'info',
          title: 'Filters arrive with your first research',
          msg: 'Run a research to populate the library.',
        });
      }
    });

    document.getElementById('btn-bell').addEventListener('click', () => {
      const dot = document.getElementById('bell-dot');
      if (dot) dot.style.display = 'none';
      window.NRDToast.show({
        type: 'info',
        title: "You're all caught up",
        msg: 'Agent alerts will appear here once research runs begin.',
      });
    });

    document.getElementById('btn-updates').addEventListener('click', () => {
      if (window.NRDUpdaterUI && window.NRDUpdaterUI.lastState) {
        window.NRDUpdaterUI.render(window.NRDUpdaterUI.lastState);
      }
    });

    const search = document.getElementById('global-search');
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') search.blur();
      if (e.key === 'Enter') {
        window.NRDToast.show({
          type: 'info',
          title: 'Global search',
          msg: 'The research index powers search from Phase 1 onward.',
        });
        search.blur();
      }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        search.focus();
        search.select();
      }
    });
  }

  /* -------------------------------- status bar -------------------------------- */

  function buildStatusBar() {
    const bar = document.createElement('div');
    bar.className = 'statusbar';
    bar.innerHTML = `
      <span class="sb-dot"></span>
      <span id="sb-status">All systems operational</span>
      <div class="sb-right">
        <span>35 agents · 5 layers</span>
        <span>·</span>
        <span><b>v${appInfo.version}</b></span>
      </div>`;
    document.body.appendChild(bar);
  }

  /* ----------------------------------- boot ----------------------------------- */

  async function boot() {
    appInfo = await window.nrd.init();
    settings = await window.nrd.getSettings();
    window.NRDSettings = settings;

    window.NRDTheme.init(settings.theme);
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
    document.body.classList.toggle('sidebar-collapsed', !!settings.sidebarCollapsed);

    wireTitleBar();
    wireSidebar();
    wireTopbar();
    buildStatusBar();

    window.addEventListener('hashchange', fromHash);
    if (!fromHash() && !currentPage) setPage('dashboard');

    window.NRDUpdaterUI.init();

    // smooth open animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.getElementById('app').classList.add('ready'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
