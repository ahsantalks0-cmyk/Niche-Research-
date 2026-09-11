'use strict';

/**
 * NRD · updater-ui.js — in-app auto-update experience (Atelier styling).
 */
(function () {
  let banner = null;
  let lastState = null;

  const T = (s) => window.NRDIcons.get(s);

  function fmtBps(bps) {
    if (!bps) return '—';
    return bps > 1024 * 1024
      ? `${(bps / (1024 * 1024)).toFixed(1)} MB/s`
      : `${Math.max(1, Math.round(bps / 1024))} KB/s`;
  }

  function fmtEta(sec) {
    if (sec == null) return '';
    if (sec < 5) return 'almost done';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `~${m}m ${s}s left` : `~${s}s left`;
  }

  function ensureBanner() {
    if (banner) return banner;
    banner = document.createElement('div');
    banner.className = 'update-banner hidden';
    banner.setAttribute('role', 'alertdialog');
    banner.innerHTML = `
      <div class="ub-head">
        <div class="ub-ic">${T('download')}</div>
        <div>
          <div class="ub-title">Software Update</div>
          <div class="ub-sub">—</div>
        </div>
      </div>
      <div class="ub-progress" style="display:none">
        <div class="progress"><div class="bar"></div></div>
        <div class="ub-stats">
          <span class="ub-pct">0%</span>
          <span class="ub-mb">0 MB / 0 MB</span>
          <span class="ub-eta"></span>
        </div>
      </div>
      <div class="ub-actions"></div>`;
    document.body.appendChild(banner);
    return banner;
  }

  function hideBanner() { if (banner) banner.classList.add('hidden'); }

  function setActions(defs) {
    const wrap = banner.querySelector('.ub-actions');
    wrap.innerHTML = '';
    (defs || []).forEach(({ label, cls, onClick }) => {
      const b = document.createElement('button');
      b.className = `btn ${cls}`;
      b.textContent = label;
      b.addEventListener('click', onClick);
      wrap.appendChild(b);
    });
  }

  function render(state) {
    if (!state) return;
    lastState = state;

    const btnUpdates = document.getElementById('btn-updates');
    const dotBell = document.getElementById('bell-dot');
    const statusEl = document.getElementById('sb-status');

    if (statusEl) {
      let line = 'All systems operational';
      if (state.status === 'checking') line = 'Checking for updates…';
      else if (state.status === 'downloading') line = `Downloading update — ${state.percent}%`;
      else if (state.status === 'downloaded') line = 'Update ready to install';
      else if (state.status === 'error') line = 'Update check failed';
      else if (state.status === 'available') line = `Update available — v${state.version}`;
      statusEl.textContent = line;
    }

    switch (state.status) {
      case 'idle':
      case 'checking':
      case 'up-to-date':
      case 'disabled-dev':
        hideBanner();
        if (btnUpdates) btnUpdates.style.display = 'none';
        if (dotBell) dotBell.style.display = 'none';
        break;

      case 'available': {
        const b = ensureBanner();
        b.classList.remove('hidden');
        b.querySelector('.ub-title').textContent = 'New version available';
        b.querySelector('.ub-sub').textContent =
          `Version ${state.version} is ready to download. You are on v${state.currentVersion}.`;
        b.querySelector('.ub-progress').style.display = 'none';
        setActions([
          { label: 'Update Now', cls: 'btn-cu', onClick: () => window.nrd.updaterDownload() },
          { label: 'Later', cls: 'btn-ghost', onClick: hideBanner },
        ]);
        if (btnUpdates) btnUpdates.style.display = '';
        if (dotBell) dotBell.style.display = '';
        window.NRDToast.show({
          type: 'info',
          title: `Update available — v${state.version}`,
          msg: 'Click "Update Now" to install it.',
        });
        break;
      }

      case 'downloading': {
        const b = ensureBanner();
        b.classList.remove('hidden');
        b.querySelector('.ub-title').textContent = 'Downloading update…';
        b.querySelector('.ub-progress').style.display = '';
        b.querySelector('.bar').style.width = `${state.percent}%`;
        b.querySelector('.ub-pct').textContent = `${state.percent}%`;
        b.querySelector('.ub-mb').textContent = `${state.transferredMb} MB / ${state.totalMb} MB`;
        b.querySelector('.ub-eta').textContent = `${fmtBps(state.bytesPerSecond)} · ${fmtEta(state.etaSec)}`;
        setActions([]);
        break;
      }

      case 'downloaded': {
        const b = ensureBanner();
        b.classList.remove('hidden');
        b.querySelector('.ub-title').textContent = 'Update ready';
        b.querySelector('.ub-sub').textContent =
          `Version ${state.version} downloaded — restart to apply it.`;
        b.querySelector('.ub-progress').style.display = 'none';
        setActions([
          { label: 'Restart to Update', cls: 'btn-cu', onClick: () => window.nrd.updaterInstall() },
          { label: 'Later', cls: 'btn-ghost', onClick: hideBanner },
        ]);
        window.NRDToast.show({
          type: 'success',
          title: 'Update downloaded',
          msg: 'Restart to apply the new version.',
        });
        break;
      }

      case 'error':
        hideBanner();
        if (statusEl) statusEl.textContent = 'Update check failed';
        break;

      default:
        break;
    }
  }

  window.NRDUpdaterUI = {
    init() {
      if (!window.nrd) return;
      window.nrd.onUpdaterState(render);
      window.nrd.updaterGetState().then(render).catch(() => {});
    },
    render,
    get lastState() { return lastState; },
  };
})();
