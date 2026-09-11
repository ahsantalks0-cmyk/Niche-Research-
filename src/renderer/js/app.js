'use strict';

/**
 * NRD · app.js — SPA orchestrator (NOIR ATELIER).
 * Hash routing across 6 pages, dock navigation, masthead actions, boot.
 */
(function () {
  let currentPage = null;
  let settings = {};
  let appInfo = { version: '' };

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

    document.querySelectorAll('.dock-item').forEach((n) => {
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
    return true;
  }

  /* --------------------------------- masthead -------------------------------- */

  function wireMasthead() {
    // theme toggle (shows the icon of the theme you'd switch to)
    document.getElementById('btn-theme').addEventListener('click', () => NRDTheme.toggle());

    // notifications
    document.getElementById('btn-bell').addEventListener('click', () => {
      const dot = document.getElementById('bell-dot');
      if (dot) dot.style.display = 'none';
      window.NRDToast.show({
        type: 'info',
        title: "You're all caught up",
        msg: 'Agent alerts will appear here once research runs begin.',
      });
    });

    // update button re-opens the banner
    document.getElementById('btn-updates').addEventListener('click', () => {
      if (window.NRDUpdaterUI && window.NRDUpdaterUI.lastState) {
        window.NRDUpdaterUI.render(window.NRDUpdaterUI.lastState);
      }
    });

    // profile
    document.getElementById('mh-profile').addEventListener('click', () => {
      window.NRDToast.show({
        type: 'info',
        title: 'Research Director',
        msg: 'Team profiles and permissions arrive with multi-user support.',
      });
    });

    // global search
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

    // data-goto delegation (CTA buttons)
    document.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) location.hash = `/${go.dataset.goto}`;
    });
  }

  /* ----------------------------------- dock ----------------------------------- */

  function wireDock() {
    document.querySelectorAll('.dock-item').forEach((item) => {
      item.addEventListener('click', () => { location.hash = `/${item.dataset.page}`; });
    });
  }

  /* ----------------------------------- boot ----------------------------------- */

  async function boot() {
    appInfo = await window.nrd.init();
    settings = await window.nrd.getSettings();
    window.NRDSettings = settings;

    window.NRDTheme.init(settings.theme);
    document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);
    document.getElementById('sb-version').textContent = `v${appInfo.version}`;

    wireMasthead();
    wireDock();

    window.addEventListener('hashchange', fromHash);
    fromHash();

    window.NRDUpdaterUI.init();

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
