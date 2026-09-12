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
                  <div class="sr-desc">Powers the Discovery and Deep Research layers (stored in app_settings).</div>
                </div>
              </div>
              <div class="api-row">
                <input class="input" id="key-gemini" type="password" placeholder="AIzaSy…" />
                <button class="btn btn-outline" id="btn-paste-gemini">Paste</button>
              </div>
              <div class="set-row" style="padding-bottom:10px; margin-top:12px">
                <div style="flex:1">
                  <div class="sr-title">Jarvis API Key</div>
                  <div class="sr-desc">Orchestrates the Control layer and the Senior Consultant (stored in app_settings).</div>
                </div>
              </div>
              <div class="api-row">
                <input class="input" id="key-jarvis" type="password" placeholder="Enter Jarvis key…" />
                <button class="btn btn-outline" id="btn-paste-jarvis">Paste</button>
              </div>
              <div style="display:flex; justify-content:flex-end; margin-top:12px">
                <button class="btn btn-cu" id="btn-save-keys">Save API Keys</button>
              </div>
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

            <div class="panel panel-pad" id="panel-db-health">
              <div class="section-label" style="display:flex; align-items:center; justify-content:space-between">
                <span>Database Health</span>
                <span class="badge badge-active" style="font-size:10px">SQLite WAL</span>
              </div>
              <div class="kv-row" style="margin-top:8px">
                <span class="kv-k">Schema Version</span>
                <span class="kv-v" id="dbh-version">v1 (35 agents)</span>
              </div>
              <div class="kv-row">
                <span class="kv-k">DB Size</span>
                <span class="kv-v" id="dbh-size">…</span>
              </div>
              <div class="kv-row" style="flex-direction:column; align-items:flex-start; gap:4px">
                <span class="kv-k">DB File Path (userData)</span>
                <span class="kv-v text-mono" id="dbh-path" style="font-size:10.5px; word-break:break-all; color:var(--text-3); user-select:all">…</span>
              </div>
              <div style="margin-top:12px; border-top:1px solid var(--border); padding-top:10px">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                  <span style="font-size:11.5px; font-weight:550">Table Registry (37 Tables)</span>
                  <button class="btn btn-outline" id="btn-refresh-dbh" style="padding:4px 8px; font-size:11px">Refresh</button>
                </div>
                <div id="dbh-tables" style="max-height:160px; overflow-y:auto; display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px">
                  <!-- Dynamic table row counts -->
                </div>
              </div>
            </div>
          </div>

          <!-- ═══════════════ Engine Architecture & Test Harness (Part 7) ═══════════════ -->
          <div class="panel panel-pad engine-test-panel">
            <div class="section-label" style="display:flex; align-items:center; justify-content:space-between">
              <span>Browser Engine Architecture &amp; Test Suite</span>
              <div style="display:flex; gap:8px">
                <button class="btn btn-outline" id="btn-engine-logs" style="padding:4px 10px; font-size:11.5px">
                  Open Engine Terminal
                </button>
                <button class="btn btn-outline" id="btn-engine-prune" style="padding:4px 10px; font-size:11.5px">
                  Prune Cache
                </button>
              </div>
            </div>

            <div class="engine-status-bar">
              <div class="engine-slots-live" id="engine-slots-live">
                <div class="engine-slot-pill" id="esp-1"><span class="pill-dot"></span> <span>Slot #1: IDLE</span></div>
                <div class="engine-slot-pill" id="esp-2"><span class="pill-dot"></span> <span>Slot #2: IDLE</span></div>
                <div class="engine-slot-pill" id="esp-3"><span class="pill-dot"></span> <span>Slot #3: IDLE</span></div>
              </div>
              <div style="font-size:11.5px; color:var(--text-3); font-family:var(--font-mono, monospace)" id="engine-cache-status">
                Cache: 0 items · 0 hits
              </div>
            </div>

            <div class="engine-test-cards">
              <div class="engine-test-card">
                <div class="etc-title">
                  <span>1. Real Chrome Launch</span>
                  <span class="badge" style="font-size:9.5px">Pillar 2</span>
                </div>
                <div class="etc-desc">
                  Launches installed Google Chrome (channel: 'chrome') with warm user profile and human viewport.
                </div>
                <button class="btn btn-cu btn-sm" id="btn-test-chrome" style="width:100%; margin-top:auto">
                  Run Test
                </button>
              </div>

              <div class="engine-test-card">
                <div class="etc-title">
                  <span>2. 3-Slot Concurrency</span>
                  <span class="badge" style="font-size:9.5px">Pillar 2</span>
                </div>
                <div class="etc-desc">
                  Dispatches 3 simultaneous searches across parallel browser slots with overlapping timestamps.
                </div>
                <button class="btn btn-cu btn-sm" id="btn-test-slots" style="width:100%; margin-top:auto">
                  Run Test
                </button>
              </div>

              <div class="engine-test-card">
                <div class="etc-title">
                  <span>3. Cache Hit vs Miss</span>
                  <span class="badge" style="font-size:9.5px">Pillar 1</span>
                </div>
                <div class="etc-desc">
                  Validates persistent SQLite page cache. First search is a miss, second search resolves in &lt;5ms.
                </div>
                <button class="btn btn-cu btn-sm" id="btn-test-cache" style="width:100%; margin-top:auto">
                  Run Test
                </button>
              </div>

              <div class="engine-test-card">
                <div class="etc-title">
                  <span>4. Rate Limiter</span>
                  <span class="badge" style="font-size:9.5px">Pillar 3</span>
                </div>
                <div class="etc-desc">
                  Fires rapid Google requests to demonstrate token bucket throttling and queueing.
                </div>
                <button class="btn btn-cu btn-sm" id="btn-test-ratelimit" style="width:100%; margin-top:auto">
                  Run Test
                </button>
              </div>

              <div class="engine-test-card">
                <div class="etc-title">
                  <span>5. CAPTCHA Safety Net</span>
                  <span class="badge" style="font-size:9.5px">Part 4</span>
                </div>
                <div class="etc-desc">
                  Simulates CAPTCHA detection to verify chime sound, persistent sticky banner, and slot pause.
                </div>
                <button class="btn btn-cu btn-sm" id="btn-test-captcha" style="width:100%; margin-top:auto">
                  Run Test
                </button>
              </div>

              <div class="engine-test-card">
                <div class="etc-title">
                  <span>6. Timing Breakdown</span>
                  <span class="badge" style="font-size:9.5px">Pillar 7</span>
                </div>
                <div class="etc-desc">
                  Retrieves aggregated timing metrics, cache hit savings, and phase durations.
                </div>
                <button class="btn btn-cu btn-sm" id="btn-test-timing" style="width:100%; margin-top:auto">
                  Run Test
                </button>
              </div>

              <div class="engine-test-card">
                <div class="etc-title">
                  <span>7. Browser Isolation</span>
                  <span class="badge" style="font-size:9.5px">Part 5</span>
                </div>
                <div class="etc-desc">
                  Verifies isolated user profiles, PID tracking, and zero touch of existing user tabs.
                </div>
                <button class="btn btn-cu btn-sm" id="btn-test-isolation" style="width:100%; margin-top:auto">
                  Run Test
                </button>
              </div>
            </div>

            <div style="font-size:11.5px; font-weight:600; color:var(--text-2); margin-bottom:6px">Test Output Console</div>
            <div class="engine-test-console" id="engine-test-console">Click any test button above to run harness verification…</div>
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
      themeCards.forEach((c) => c.addEventListener('click', () => {
        NRDTheme.set(c.dataset.theme);
        if (window.dbAPI) {
          window.dbAPI.saveSettings({ theme: c.dataset.theme }).catch(() => {});
        }
      }));
      this._unTheme = NRDTheme.onChange(syncThemeCards);

      /* toggles & selects */
      const auto = document.getElementById('set-autoapprove');
      auto.checked = !!settings.autoApprove;
      auto.addEventListener('change', () => {
        window.NRDSettings = window.NRDSettings || {};
        window.NRDSettings.autoApprove = auto.checked;
        window.dispatchEvent(new CustomEvent('nrd:settings-changed', { detail: { autoApprove: auto.checked } }));

        if (window.dbAPI) {
          window.dbAPI.saveSettings({ autoApprove: auto.checked }).catch(() => {});
        } else if (window.nrd) {
          window.nrd.setSettings({ autoApprove: auto.checked });
        }
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
        if (window.nrd) window.nrd.setSettings({ reduceMotion: reduce.checked });
      });

      const lang = document.getElementById('set-language');
      lang.value = settings.language || 'en';
      lang.addEventListener('change', () => {
        if (window.dbAPI) {
          window.dbAPI.saveSettings({ language: lang.value }).catch(() => {});
        } else if (window.nrd) {
          window.nrd.setSettings({ language: lang.value });
        }
        NRDToast.show({
          type: 'info',
          title: 'Language preference saved',
          msg: lang.value === 'ur' ? 'اردو ترجمہ Phase 2 میں آ رہا ہے' : 'English is active in SQLite app_settings.',
        });
      });

      /* API keys elements */
      const keyGemini = document.getElementById('key-gemini');
      const keyJarvis = document.getElementById('key-jarvis');
      const btnPasteGemini = document.getElementById('btn-paste-gemini');
      const btnPasteJarvis = document.getElementById('btn-paste-jarvis');
      const btnSaveKeys = document.getElementById('btn-save-keys');

      if (btnPasteGemini) {
        btnPasteGemini.addEventListener('click', async () => {
          try {
            const txt = await navigator.clipboard.readText();
            if (txt) keyGemini.value = txt.trim();
          } catch {
            NRDToast.show({ type: 'warning', title: 'Clipboard unavailable', msg: 'Please paste manually into the field.' });
          }
        });
      }

      if (btnPasteJarvis) {
        btnPasteJarvis.addEventListener('click', async () => {
          try {
            const txt = await navigator.clipboard.readText();
            if (txt) keyJarvis.value = txt.trim();
          } catch {
            NRDToast.show({ type: 'warning', title: 'Clipboard unavailable', msg: 'Please paste manually into the field.' });
          }
        });
      }

      if (btnSaveKeys) {
        btnSaveKeys.addEventListener('click', async () => {
          if (!window.dbAPI) return;
          btnSaveKeys.disabled = true;
          try {
            await window.dbAPI.saveSettings({
              geminiApiKey: keyGemini.value.trim(),
              jarvisApiKey: keyJarvis.value.trim(),
            });
            NRDToast.show({
              type: 'success',
              title: 'API credentials saved',
              msg: 'Persisted securely into SQLite app_settings table.',
            });
          } catch (err) {
            NRDToast.show({ type: 'error', title: 'Save failed', msg: err.message });
          } finally {
            btnSaveKeys.disabled = false;
          }
        });
      }

      /* Load initial values from SQLite app_settings */
      if (window.dbAPI) {
        window.dbAPI.getSettings().then((dbSet) => {
          if (!dbSet) return;
          if (dbSet.theme) {
            NRDTheme.set(dbSet.theme);
            syncThemeCards();
          }
          if (auto) {
            auto.checked = !!dbSet.autoApprove;
            window.NRDSettings = window.NRDSettings || {};
            window.NRDSettings.autoApprove = auto.checked;
          }
          if (lang) lang.value = dbSet.language || 'en';
          if (keyGemini && dbSet.geminiApiKey) keyGemini.value = dbSet.geminiApiKey;
          if (keyJarvis && dbSet.jarvisApiKey) keyJarvis.value = dbSet.jarvisApiKey;
        }).catch(() => {});
      }

      /* DB Health loader */
      const renderDbHealth = async () => {
        if (!window.dbAPI) return;
        try {
          const health = await window.dbAPI.getDbHealth();
          if (!health) return;
          const vEl = document.getElementById('dbh-version');
          const sEl = document.getElementById('dbh-size');
          const pEl = document.getElementById('dbh-path');
          const tEl = document.getElementById('dbh-tables');

          if (vEl) vEl.textContent = `v${health.schemaVersion} (35 agents)`;
          if (sEl) sEl.textContent = `${(health.dbSizeBytes / 1024).toFixed(1)} KB (WAL mode active)`;
          if (pEl) pEl.textContent = health.dbPath || 'app.getPath("userData")/niche_research.db';

          if (tEl && health.tables) {
            tEl.innerHTML = Object.entries(health.tables).map(([tbl, cnt]) => `
              <div style="background:var(--bg-3); padding:4px 6px; border-radius:4px; border:1px solid var(--border); display:flex; justify-content:space-between">
                <span class="text-mono" style="font-size:10px; color:var(--text-2)">${tbl}</span>
                <span class="badge ${cnt > 0 ? 'badge-active' : ''}" style="font-size:9.5px; padding:1px 5px">${cnt}</span>
              </div>
            `).join('');
          }
        } catch {
          // DB health fetch silent fallback
        }
      };

      renderDbHealth();
      const btnRefreshDbh = document.getElementById('btn-refresh-dbh');
      if (btnRefreshDbh) {
        btnRefreshDbh.addEventListener('click', () => {
          btnRefreshDbh.disabled = true;
          renderDbHealth().finally(() => {
            btnRefreshDbh.disabled = false;
            NRDToast.show({ type: 'info', title: 'Database diagnostics refreshed', msg: 'All 35 table row counts updated.' });
          });
        });
      }

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

      /* ═══════════════ Engine Test Harness & Telemetry (Part 7) ═══════════════ */
      const consoleEl = document.getElementById('engine-test-console');
      const logToConsole = (msg) => {
        if (!consoleEl) return;
        const ts = new Date().toTimeString().split(' ')[0];
        consoleEl.textContent = `[${ts}] ${msg}\n\n` + consoleEl.textContent;
      };

      const updateSlotPills = (slots) => {
        if (!Array.isArray(slots)) return;
        slots.forEach((s) => {
          const pill = document.getElementById(`esp-${s.id}`);
          if (!pill) return;
          pill.className = `engine-slot-pill ${s.status}`;
          const label = pill.querySelector('span:last-child');
          if (label) {
            label.textContent = `Slot #${s.id}: ${s.status.toUpperCase()}${s.currentDomain ? ' (' + s.currentDomain + ')' : ''}`;
          }
        });
      };

      const refreshEngineCache = async () => {
        if (!window.engineAPI) return;
        try {
          const stats = await window.engineAPI.getCacheStats();
          const el = document.getElementById('engine-cache-status');
          if (el && stats) {
            el.textContent = `Cache: ${stats.totalEntries} entries · ${stats.totalHits} hits · ${((stats.totalSizeBytes || 0) / 1024).toFixed(1)} KB`;
          }
        } catch {}
      };

      // Poll initial state
      if (window.engineAPI) {
        window.engineAPI.getSlots().then(updateSlotPills).catch(() => {});
        refreshEngineCache();
        this._unSlots = window.engineAPI.onSlotsUpdated(updateSlotPills);
      }

      // Live Logs quick open
      const btnLogs = document.getElementById('btn-engine-logs');
      if (btnLogs) {
        btnLogs.addEventListener('click', () => {
          if (window.NRDLiveLogs) window.NRDLiveLogs.open();
        });
      }

      // Prune Cache
      const btnPrune = document.getElementById('btn-engine-prune');
      if (btnPrune) {
        btnPrune.addEventListener('click', async () => {
          if (!window.engineAPI) return;
          btnPrune.disabled = true;
          try {
            const res = await window.engineAPI.pruneCache();
            logToConsole(`Cache pruned: ${res.prunedCount} expired entries removed.`);
            refreshEngineCache();
            NRDToast.show({ type: 'success', title: 'Cache pruned', msg: `${res.prunedCount} expired entries cleaned.` });
          } catch (err) {
            logToConsole(`Error pruning cache: ${err.message}`);
          } finally {
            btnPrune.disabled = false;
          }
        });
      }

      // Test Harness Button Binder
      const wireTest = (btnId, testName, testArgs, label) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('click', async () => {
          if (!window.engineAPI) {
            NRDToast.show({ type: 'warning', title: 'Engine API', msg: 'Engine API not available in browser preview.' });
            return;
          }
          btn.disabled = true;
          const origText = btn.textContent;
          btn.textContent = 'Testing…';
          logToConsole(`=== STARTING TEST: ${label} ===`);
          try {
            const res = await window.engineAPI.runTest(testName, testArgs);
            logToConsole(`✓ SUCCESS: ${label}\n${JSON.stringify(res, null, 2)}`);
            refreshEngineCache();
            NRDToast.show({ type: 'success', title: 'Test Passed', msg: `${label} verified successfully.` });
          } catch (err) {
            logToConsole(`✕ FAILED: ${label}\nError: ${err.message}`);
            NRDToast.show({ type: 'error', title: 'Test Failed', msg: err.message });
          } finally {
            btn.disabled = false;
            btn.textContent = origText;
          }
        });
      };

      wireTest('btn-test-chrome', 'google-searches', { queries: ['luxury travel accessories'] }, 'Real Chrome Launch');
      wireTest('btn-test-slots', 'parallel-slots', {}, '3-Slot Concurrency');
      wireTest('btn-test-cache', 'cache', { keyword: 'b2b saas compliance software' }, 'Cache Hit vs Miss');
      wireTest('btn-test-ratelimit', 'rate-limiter', {}, 'Rate Limiter Throttling');
      wireTest('btn-test-captcha', 'captcha-alert', {}, 'CAPTCHA Safety Net Alert');
      wireTest('btn-test-timing', 'timing-summary', {}, 'Timing Breakdown');
      wireTest('btn-test-isolation', 'browser-isolation', {}, 'Browser Process Isolation');
    },

    destroy() {
      if (this._unTheme) this._unTheme();
      if (this._unUpdater) this._unUpdater();
      if (this._unSlots) this._unSlots();
    },
  };

  window.NRDPages.settings = PAGE;
})();
