'use strict';

/**
 * NRD · pages/settings.js — Settings (Noir Atelier).
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
        <div class="page-head">
          <div>
            <h2>Department preferences</h2>
            <div class="ph-sub">Appearance, agent behavior, updates and credentials.</div>
          </div>
        </div>

        <div class="settings-grid">
          <div style="display:flex; flex-direction:column; gap:14px">
            <div class="panel panel-pad">
              <div class="section-label">Appearance</div>
              <div class="theme-cards" id="theme-cards">
                <button class="theme-card" data-theme="dark" type="button">
                  <div class="tc-strip tc-dark"></div>
                  <div class="tc-name">${NRDIcons.get('moon')} Noir <span class="tc-tag">Default</span></div>
                </button>
                <button class="theme-card" data-theme="light" type="button">
                  <div class="tc-strip tc-light"></div>
                  <div class="tc-name">${NRDIcons.get('sun')} Gallery</div>
                </button>
              </div>
            </div>

            <div class="panel panel-pad">
              <div class="section-label">Agent Behavior</div>
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

            <div class="panel panel-pad">
              <div class="section-label">API Keys</div>
              <div class="set-row" style="padding-bottom:10px">
                <div style="flex:1">
                  <div class="sr-title">Gemini API Key</div>
                  <div class="sr-desc">Powers the Discovery and Deep Research layers.</div>
                </div>
              </div>
              <div class="api-row">
                <input class="input" id="key-gemini" type="password" placeholder="AIza…" disabled />
                <button class="btn btn-outline" disabled>Paste</button>
              </div>
              <div class="set-row" style="padding-bottom:10px; margin-top:12px">
                <div style="flex:1">
                  <div class="sr-title">Jarvis API Key</div>
                  <div class="sr-desc">Orchestrates the Control layer and the Senior Consultant.</div>
                </div>
              </div>
              <div class="api-row">
                <input class="input" id="key-jarvis" type="password" placeholder="Paste your Jarvis key…" disabled />
                <button class="btn btn-outline" disabled>Paste</button>
              </div>
              <p class="text-faint" style="font-size:11px; margin-top:12px">
                Key entry unlocks when the agent runtime ships in Phase 1.
              </p>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:14px">
            <div class="panel panel-pad panel-hero">
              <div class="section-label">Updates</div>
              <div id="settings-update-state" style="font-size:13px; color:var(--text-2); margin-bottom:14px">
                Update status will appear here.
              </div>
              <div class="progress" id="settings-update-progress" style="display:none; margin-bottom:10px">
                <div class="bar"></div>
              </div>
              <div id="settings-update-stats" style="font-size:11.5px; color:var(--text-3); margin-bottom:14px"></div>
              <button class="btn btn-cu btn-block" id="btn-check-updates">
                ${NRDIcons.get('refresh')} Check for Updates
              </button>
              <button class="btn btn-em btn-block" id="btn-restart-update" style="margin-top:10px; display:none">
                ${NRDIcons.get('download')} Restart to Apply Update
              </button>
            </div>

            <div class="panel panel-pad">
              <div class="section-label">About</div>
              <div style="display:flex; align-items:center; gap:14px; margin-bottom:14px">
                <img src="../../assets/icons/icon-64x64.png" alt="NRD"
                     style="width:48px; height:48px; border-radius:12px; box-shadow: var(--glow-cu)" />
                <div>
                  <div style="font-weight:550; font-size:14.5px">Niche Research Department</div>
                  <div class="text-muted" style="font-size:11.5px">Agentic Intelligence for Niche Discovery</div>
                </div>
              </div>
              <div class="kv-row">
                <span class="kv-k">Version</span>
                <span class="kv-v" id="about-version">…</span>
              </div>
              <div class="kv-row">
                <span class="kv-k">Runtime</span>
                <span class="kv-v" id="about-electron">…</span>
              </div>
              <div class="kv-row">
                <span class="kv-k">Agent Roster</span>
                <span class="kv-v">35 agents · 5 layers</span>
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
            stateEl.textContent = 'Ready. The app checks automatically at launch.';
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
    },

    destroy() {
      if (this._unTheme) this._unTheme();
      if (this._unUpdater) this._unUpdater();
    },
  };

  window.NRDPages.settings = PAGE;
})();
