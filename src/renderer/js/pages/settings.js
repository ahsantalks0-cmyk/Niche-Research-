'use strict';

/**
 * NRD · pages/settings.js — Settings: appearance, approval gate, language,
 * updates (manual check + same banner flow), about/version, API keys.
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  const PAGE = {
    title: 'Settings',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-settings';

      el.innerHTML = `
        <div class="settings-grid">
          <div style="display:flex; flex-direction:column; gap:18px">
            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:14px">
                <h2>Appearance</h2>
                <p>Choose the department's look. The theme applies instantly across every page and chart.</p>
              </div>
              <div class="theme-cards" id="theme-cards">
                <button class="theme-card" data-theme="dark" type="button">
                  <div class="tc-strip tc-dark"></div>
                  <div class="tc-name">${NRDIcons.get('moon')} Obsidian <span class="text-faint" style="font-weight:400; font-size:11px">(default)</span></div>
                </button>
                <button class="theme-card" data-theme="light" type="button">
                  <div class="tc-strip tc-light"></div>
                  <div class="tc-name">${NRDIcons.get('sun')} Ivory</div>
                </button>
              </div>
            </div>

            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:4px">
                <h2>Agent Behavior</h2>
                <p>Control how much the autonomous swarm may do without you.</p>
              </div>
              <div class="set-row">
                <div>
                  <div class="sr-title">Auto-approve agent actions</div>
                  <div class="sr-desc">When enabled, the Approval Gate lets agents proceed without asking you each time. Keep it off for full manual control.</div>
                </div>
                <label class="toggle" title="Auto-approve agent actions">
                  <input type="checkbox" id="set-autoapprove" />
                  <span class="track"><span class="thumb"></span></span>
                </label>
              </div>
              <div class="set-row">
                <div>
                  <div class="sr-title">Language</div>
                  <div class="sr-desc">Interface language for the whole department.</div>
                </div>
                <select class="select" id="set-language" style="width:170px">
                  <option value="en">English</option>
                  <option value="ur">اردو (Urdu)</option>
                </select>
              </div>
              <div class="set-row">
                <div>
                  <div class="sr-title">Reduce motion</div>
                  <div class="sr-desc">Minimize animations across the interface.</div>
                </div>
                <label class="toggle" title="Reduce motion">
                  <input type="checkbox" id="set-reduce-motion" />
                  <span class="track"><span class="thumb"></span></span>
                </label>
              </div>
            </div>

            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:4px">
                <h2>API Keys</h2>
                <p>Model and service credentials used by the agent layers (stored locally, activated in Phase 1+).</p>
              </div>
              <div class="set-row">
                <div style="flex:1">
                  <div class="sr-title">Gemini API Key</div>
                  <div class="sr-desc">Powers the Discovery and Deep Research layers.</div>
                </div>
              </div>
              <div class="api-row" style="margin-top:10px">
                <input class="input" id="key-gemini" type="password" placeholder="AIza…" disabled />
                <button class="btn btn-outline" disabled>Paste</button>
              </div>
              <div class="set-row" style="margin-top:12px">
                <div style="flex:1">
                  <div class="sr-title">Jarvis API Key</div>
                  <div class="sr-desc">Orchestrates the Control layer and the Senior Consultant.</div>
                </div>
              </div>
              <div class="api-row" style="margin-top:10px">
                <input class="input" id="key-jarvis" type="password" placeholder="Paste your Jarvis key…" disabled />
                <button class="btn btn-outline" disabled>Paste</button>
              </div>
              <p class="text-faint" style="font-size:11.5px; margin-top:12px">
                Key entry unlocks when the agent runtime ships in Phase 1.
              </p>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:18px">
            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:14px">
                <h2>Updates</h2>
                <p>The app checks GitHub Releases automatically at launch.</p>
              </div>
              <div id="settings-update-state" style="font-size:13px; color:var(--text-2); margin-bottom:14px">
                Update status will appear here.
              </div>
              <div class="progress" id="settings-update-progress" style="display:none; margin-bottom:10px">
                <div class="bar"></div>
              </div>
              <div id="settings-update-stats" style="font-size:12px; color:var(--text-3); margin-bottom:14px"></div>
              <button class="btn btn-gold btn-block" id="btn-check-updates">
                ${NRDIcons.get('refresh')} Check for Updates
              </button>
              <button class="btn btn-outline btn-block" id="btn-restart-update" style="margin-top:10px; display:none">
                ${NRDIcons.get('download')} Restart to Apply Update
              </button>
            </div>

            <div class="card card-pad">
              <div class="page-head" style="margin-bottom:14px">
                <h2>About</h2>
              </div>
              <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px">
                <img src="../../assets/icons/icon-64x64.png" alt="NRD"
                     style="width:52px; height:52px; border-radius:13px; box-shadow: var(--shadow-glow)" />
                <div>
                  <div style="font-weight:600; font-size:15px">Niche Research Department</div>
                  <div class="text-muted" style="font-size:12px">Agentic Intelligence for Niche Discovery</div>
                </div>
              </div>
              <div class="est" style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--line); font-size:12.5px">
                <span class="text-muted">Version</span>
                <span class="version-pill" style="padding:3px 10px"><b id="about-version">…</b></span>
              </div>
              <div class="est" style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--line); font-size:12.5px">
                <span class="text-muted">Electron</span><b id="about-electron" style="font-weight:600">…</b>
              </div>
              <div class="est" style="display:flex; justify-content:space-between; padding:8px 0; font-size:12.5px">
                <span class="text-muted">Agent Roster</span><b style="font-weight:600">35 agents · 5 layers</b>
              </div>
            </div>
          </div>
        </div>
      `;
      return el;
    },

    mounted() {
      const settings = window.NRDSettings || {};

      /* theme cards */
      const themeCards = document.querySelectorAll('#theme-cards .theme-card');
      const syncThemeCards = () => {
        themeCards.forEach((c) =>
          c.classList.toggle('selected', c.dataset.theme === NRDTheme.current));
      };
      syncThemeCards();
      themeCards.forEach((c) => c.addEventListener('click', () => NRDTheme.set(c.dataset.theme)));
      this._unTheme = NRDTheme.onChange(syncThemeCards);

      /* toggles */
      const auto = document.getElementById('set-autoapprove');
      auto.checked = !!settings.autoApprove;
      auto.addEventListener('change', () => {
        window.nrd.setSettings({ autoApprove: auto.checked });
        NRDToast.show({
          type: 'success',
          title: auto.checked ? 'Approval Gate disarmed' : 'Approval Gate armed',
          msg: auto.checked
            ? 'Agents will proceed without asking for approval.'
            : 'Agents must request your approval for every action.',
        });
      });

      const reduce = document.getElementById('set-reduce-motion');
      reduce.checked = !!settings.reduceMotion;
      reduce.addEventListener('change', () => {
        document.body.classList.toggle('reduce-motion', reduce.checked);
        window.nrd.setSettings({ reduceMotion: reduce.checked });
      });

      const lang = document.getElementById('set-language');
      lang.value = settings.language || 'en';
      lang.addEventListener('change', () => {
        window.nrd.setSettings({ language: lang.value });
        NRDToast.show({
          type: 'info',
          title: 'Language preference saved',
          msg: lang.value === 'ur' ? 'اردو ترجمہ Phase 2 میں آ رہا ہے' : 'English is active.',
        });
      });

      /* about */
      window.nrd.init().then((info) => {
        document.getElementById('about-version').textContent = `v${info.version}`;
        document.getElementById('about-electron').textContent = `Electron ${info.electron}`;
      }).catch(() => {});

      /* updates */
      const stateEl = document.getElementById('settings-update-state');
      const progEl = document.getElementById('settings-update-progress');
      const barEl = progEl.querySelector('.bar');
      const statsEl = document.getElementById('settings-update-stats');
      const btnCheck = document.getElementById('btn-check-updates');
      const btnRestart = document.getElementById('btn-restart-update');

      const renderUpdate = (s) => {
        if (!s) return;
        PAGE._updateState = s;
        switch (s.status) {
          case 'idle':
            stateEl.textContent = 'Ready. Last check runs automatically at launch.';
            break;
          case 'checking':
            stateEl.textContent = 'Checking GitHub Releases…';
            break;
          case 'up-to-date':
            stateEl.innerHTML = `✓ You are on the latest version (<b>v${s.currentVersion}</b>).`;
            break;
          case 'available':
            stateEl.innerHTML = `⬆ New version <b>v${s.version}</b> is available — use the banner, or download below.`;
            break;
          case 'downloading':
            stateEl.textContent = `Downloading update — ${s.percent}%`;
            progEl.style.display = '';
            barEl.style.width = `${s.percent}%`;
            statsEl.textContent = `${s.transferredMb} MB / ${s.totalMb} MB`;
            break;
          case 'downloaded':
            stateEl.innerHTML = `✓ Version <b>v${s.version}</b> downloaded — restart to apply it.`;
            progEl.style.display = 'none';
            statsEl.textContent = '';
            btnRestart.style.display = '';
            break;
          case 'disabled-dev':
            stateEl.textContent = 'Updater is disabled while running from source (dev mode).';
            break;
          case 'error':
            stateEl.textContent = `Update check failed: ${s.message || 'unknown error'}`;
            break;
          default:
            break;
        }
      };

      btnCheck.addEventListener('click', async () => {
        btnCheck.disabled = true;
        btnCheck.innerHTML = `${NRDIcons.get('refresh')} Checking…`;
        try {
          renderUpdate(await window.nrd.updaterCheck());
        } finally {
          btnCheck.disabled = false;
          btnCheck.innerHTML = `${NRDIcons.get('refresh')} Check for Updates`;
        }
      });

      btnRestart.addEventListener('click', () => window.nrd.updaterInstall());

      renderUpdate(NRDUpdaterUI.lastState);
      this._unUpdater = window.nrd.onUpdaterState(renderUpdate);

      // one-click download from the settings page too
      this._onAvailClick = () => window.nrd.updaterDownload();
    },

    destroy() {
      if (this._unTheme) this._unTheme();
      if (this._unUpdater) this._unUpdater();
    },
  };

  window.NRDPages.settings = PAGE;
})();
