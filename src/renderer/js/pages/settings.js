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

            <div class="panel panel-pad" id="panel-ai-provider">
              <div class="section-label">AI Provider &amp; Credentials (Multi-Provider AI System)</div>
              
              <div class="set-row">
                <div>
                  <div class="sr-title">Active AI Provider</div>
                  <div class="sr-desc">Select the LLM provider for Quality Supervisor, Consultant, and Agent intelligence.</div>
                </div>
                <select class="select" id="ai-provider-select" style="width:200px">
                  <option value="">-- Select Provider --</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="groq">Groq</option>
                </select>
              </div>

              <div id="ai-key-container" style="display:none; margin-top:12px">
                <div class="set-row" style="padding-bottom:6px">
                  <div>
                    <div class="sr-title" id="ai-key-title">API Key</div>
                    <div class="sr-desc" id="ai-key-desc">Provider API key stored securely in SQLite app_settings.</div>
                  </div>
                </div>
                <div class="api-row">
                  <input class="input" id="ai-provider-key" type="password" placeholder="Enter API Key…" />
                  <button class="btn btn-outline" id="btn-toggle-key" type="button">Show</button>
                  <button class="btn btn-outline" id="btn-paste-key" type="button">Paste</button>
                  <button class="btn btn-cu" id="btn-test-provider" type="button">Test Connection</button>
                </div>
              </div>

              <div id="ai-error-box" style="display:none; margin-top:10px; padding:10px 14px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); border-radius:8px; color:#f87171; font-size:12px">
              </div>

              <div id="ai-model-container" style="display:none; margin-top:12px">
                <div class="set-row">
                  <div>
                    <div class="sr-title">Select Model</div>
                    <div class="sr-desc">Live models fetched directly from provider API.</div>
                  </div>
                  <select class="select" id="ai-model-select" style="width:280px">
                  </select>
                </div>

                <div id="ai-status-badge" style="margin-top:10px; display:none; padding:8px 12px; border-radius:6px; font-size:12px">
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px">
                  <button class="btn btn-cu" id="btn-save-ai-config" type="button">Save AI Configuration</button>
                </div>
              </div>

              <!-- Send Test Message Mini Chat -->
              <div id="ai-test-chat-box" style="display:none; margin-top:16px; border-top:1px solid var(--border); padding-top:12px">
                <div style="font-size:12px; font-weight:600; color:var(--text-2); margin-bottom:8px">Send Test Message</div>
                <div style="display:flex; gap:8px">
                  <input class="input" id="ai-test-input" placeholder="e.g. Say hello in 10 words" style="flex:1; font-size:12px" />
                  <button class="btn btn-outline" id="btn-send-ai-test" type="button">Send</button>
                </div>
                <div id="ai-test-output" style="display:none; margin-top:10px; padding:10px; background:var(--ink-950, #08080a); border:1px solid var(--line); border-radius:6px; font-size:12px; font-family:monospace">
                </div>
              </div>

              <!-- Jarvis API Key Field -->
              <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:14px">
                <div class="set-row" style="padding-bottom:6px">
                  <div style="flex:1">
                    <div class="sr-title">Jarvis API Key</div>
                    <div class="sr-desc">Orchestrates the Control layer and the Senior Consultant (stored in app_settings).</div>
                  </div>
                </div>
                <div class="api-row">
                  <input class="input" id="key-jarvis" type="password" placeholder="Enter Jarvis key…" />
                  <button class="btn btn-outline" id="btn-paste-jarvis" type="button">Paste</button>
                  <button class="btn btn-cu" id="btn-save-jarvis" type="button">Save Jarvis Key</button>
                </div>
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

          <!-- System Tests Suite Panel (P1.3c) -->
          <div class="panel panel-pad system-tests-panel" style="margin-top:14px">
            <div class="section-label" style="display:flex; align-items:center; justify-content:space-between">
              <span>Department System Tests Suite</span>
              <button class="btn btn-cu" id="btn-run-all-system-tests" style="padding:4px 12px; font-size:11.5px">
                Run All System Tests
              </button>
            </div>
            <div style="font-size:12px; color:var(--text-3); margin-bottom:12px">
              Auto-discovered system test scripts in scripts/test-*.js. Click any test to run in Node process.
            </div>

            <div id="system-tests-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px">
              <!-- Rendered dynamically -->
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

      /* ═══════════════ Multi-Provider AI System (P1.3c) ═══════════════ */
      const aiProviderSelect = document.getElementById('ai-provider-select');
      const aiKeyContainer = document.getElementById('ai-key-container');
      const aiKeyTitle = document.getElementById('ai-key-title');
      const aiKeyDesc = document.getElementById('ai-key-desc');
      const aiProviderKey = document.getElementById('ai-provider-key');
      const btnToggleKey = document.getElementById('btn-toggle-key');
      const btnPasteKey = document.getElementById('btn-paste-key');
      const btnTestProvider = document.getElementById('btn-test-provider');
      const aiErrorBox = document.getElementById('ai-error-box');
      const aiModelContainer = document.getElementById('ai-model-container');
      const aiModelSelect = document.getElementById('ai-model-select');
      const aiStatusBadge = document.getElementById('ai-status-badge');
      const btnSaveAiConfig = document.getElementById('btn-save-ai-config');
      const aiTestChatBox = document.getElementById('ai-test-chat-box');
      const aiTestInput = document.getElementById('ai-test-input');
      const btnSendAiTest = document.getElementById('btn-send-ai-test');
      const aiTestOutput = document.getElementById('ai-test-output');
      const keyJarvis = document.getElementById('key-jarvis');
      const btnPasteJarvis = document.getElementById('btn-paste-jarvis');
      const btnSaveJarvis = document.getElementById('btn-save-jarvis');

      let currentFetchedModels = [];
      let savedSettings = {};

      if (btnToggleKey) {
        btnToggleKey.addEventListener('click', () => {
          if (aiProviderKey.type === 'password') {
            aiProviderKey.type = 'text';
            btnToggleKey.textContent = 'Hide';
          } else {
            aiProviderKey.type = 'password';
            btnToggleKey.textContent = 'Show';
          }
        });
      }

      if (btnPasteKey) {
        btnPasteKey.addEventListener('click', async () => {
          try {
            const txt = await navigator.clipboard.readText();
            if (txt) aiProviderKey.value = txt.trim();
          } catch {
            NRDToast.show({ type: 'warning', title: 'Clipboard unavailable', msg: 'Paste manually into field.' });
          }
        });
      }

      const getApiKeyFieldForProvider = (pId) => {
        if (pId === 'gemini') return savedSettings.geminiApiKey || '';
        if (pId === 'openai') return savedSettings.openaiApiKey || '';
        if (pId === 'anthropic') return savedSettings.anthropicApiKey || '';
        if (pId === 'groq') return savedSettings.groqApiKey || '';
        return '';
      };

      const setApiKeyFieldForProvider = (pId, val) => {
        if (pId === 'gemini') savedSettings.geminiApiKey = val;
        if (pId === 'openai') savedSettings.openaiApiKey = val;
        if (pId === 'anthropic') savedSettings.anthropicApiKey = val;
        if (pId === 'groq') savedSettings.groqApiKey = val;
      };

      const onProviderChanged = () => {
        const pId = aiProviderSelect.value;
        if (!pId) {
          aiKeyContainer.style.display = 'none';
          aiModelContainer.style.display = 'none';
          aiErrorBox.style.display = 'none';
          aiTestChatBox.style.display = 'none';
          return;
        }

        const providerNames = { gemini: 'Google Gemini', openai: 'OpenAI', anthropic: 'Anthropic', groq: 'Groq' };
        aiKeyTitle.textContent = `${providerNames[pId] || pId} API Key`;
        aiKeyDesc.textContent = `API Key stored in SQLite app_settings.`;
        aiProviderKey.value = getApiKeyFieldForProvider(pId);
        aiKeyContainer.style.display = '';
        aiErrorBox.style.display = 'none';
        aiModelContainer.style.display = 'none';
        aiTestChatBox.style.display = 'none';
      };

      if (aiProviderSelect) {
        aiProviderSelect.addEventListener('change', onProviderChanged);
      }

      // Test Connection & Fetch Models
      if (btnTestProvider) {
        btnTestProvider.addEventListener('click', async () => {
          const pId = aiProviderSelect.value;
          const key = aiProviderKey.value.trim();
          if (!pId || !key) {
            NRDToast.show({ type: 'warning', title: 'API Key Required', msg: 'Please enter an API Key first.' });
            return;
          }

          btnTestProvider.disabled = true;
          btnTestProvider.textContent = 'Fetching Models…';
          aiErrorBox.style.display = 'none';
          aiModelContainer.style.display = 'none';

          try {
            if (!window.llmAPI) throw new Error('llmAPI unavailable in preview mode.');
            const res = await window.llmAPI.fetchModels(pId, key);
            if (!res.success) {
              throw new Error(res.error || 'Failed to fetch models');
            }

            currentFetchedModels = res.models || [];
            aiModelSelect.innerHTML = currentFetchedModels.map((m) => {
              const freeBadge = m.freeTier ? ' [FREE TIER]' : ' [PAID]';
              return `<option value="${m.id}">${m.name} (${m.id})${freeBadge}</option>`;
            }).join('');

            // Preselect saved model if matched
            if (savedSettings.aiModel && currentFetchedModels.some(m => m.id === savedSettings.aiModel)) {
              aiModelSelect.value = savedSettings.aiModel;
            }

            aiModelContainer.style.display = '';
            setApiKeyFieldForProvider(pId, key);
            NRDToast.show({ type: 'success', title: 'Models Fetched', msg: `Found ${currentFetchedModels.length} models from live API call.` });
          } catch (err) {
            aiErrorBox.style.display = '';
            aiErrorBox.innerHTML = `<strong>Fetch Error:</strong> ${err.message}`;
            NRDToast.show({ type: 'error', title: 'Provider Error', msg: err.message });
          } finally {
            btnTestProvider.disabled = false;
            btnTestProvider.textContent = 'Test Connection';
          }
        });
      }

      // Save AI Configuration
      if (btnSaveAiConfig) {
        btnSaveAiConfig.addEventListener('click', async () => {
          const pId = aiProviderSelect.value;
          const modelId = aiModelSelect.value;
          const key = aiProviderKey.value.trim();
          if (!pId || !modelId || !key) return;

          btnSaveAiConfig.disabled = true;
          btnSaveAiConfig.textContent = 'Validating…';

          try {
            if (!window.llmAPI || !window.dbAPI) throw new Error('API unavailable');
            const valRes = await window.llmAPI.validateModel({ providerId: pId, modelId, apiKey: key });
            
            setApiKeyFieldForProvider(pId, key);
            const patch = {
              aiProvider: pId,
              aiModel: modelId,
              geminiApiKey: savedSettings.geminiApiKey || '',
              openaiApiKey: savedSettings.openaiApiKey || '',
              anthropicApiKey: savedSettings.anthropicApiKey || '',
              groqApiKey: savedSettings.groqApiKey || '',
            };

            await window.dbAPI.saveSettings(patch);
            savedSettings = { ...savedSettings, ...patch };

            if (!valRes.valid) {
              aiStatusBadge.style.display = '';
              aiStatusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
              aiStatusBadge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
              aiStatusBadge.style.color = '#f59e0b';
              aiStatusBadge.innerHTML = `⚠️ <strong>Model Warning:</strong> ${valRes.error}. Billing setup required or select a free-tier model.`;
            } else {
              aiStatusBadge.style.display = '';
              aiStatusBadge.style.background = 'rgba(34, 197, 94, 0.15)';
              aiStatusBadge.style.border = '1px solid rgba(34, 197, 94, 0.4)';
              aiStatusBadge.style.color = '#4ade80';
              aiStatusBadge.innerHTML = `✓ <strong>Connected &amp; Active:</strong> ${pId.toUpperCase()} / ${modelId}`;
            }

            aiTestChatBox.style.display = '';
            NRDToast.show({ type: 'success', title: 'AI Config Saved', msg: `Set active model to ${modelId}` });
          } catch (err) {
            NRDToast.show({ type: 'error', title: 'Save Failed', msg: err.message });
          } finally {
            btnSaveAiConfig.disabled = false;
            btnSaveAiConfig.textContent = 'Save AI Configuration';
          }
        });
      }

      // Send AI Test Message
      if (btnSendAiTest) {
        btnSendAiTest.addEventListener('click', async () => {
          const prompt = aiTestInput.value.trim() || 'Hello, specify your model name and status.';
          btnSendAiTest.disabled = true;
          aiTestOutput.style.display = '';
          aiTestOutput.textContent = 'Sending prompt to AI model…';

          try {
            if (!window.llmAPI) throw new Error('llmAPI unavailable');
            const res = await window.llmAPI.chat({
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3,
              maxTokens: 150,
            });

            if (!res.success) throw new Error(res.error || 'Chat failed');
            aiTestOutput.textContent = `[${res.modelId}] Response (${res.latencyMs}ms, ${res.usage?.totalTokens || 0} tokens):\n${res.content}`;
          } catch (err) {
            aiTestOutput.textContent = `Error: ${err.message}`;
          } finally {
            btnSendAiTest.disabled = false;
          }
        });
      }

      // Jarvis paste & save
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

      if (btnSaveJarvis) {
        btnSaveJarvis.addEventListener('click', async () => {
          if (!window.dbAPI) return;
          btnSaveJarvis.disabled = true;
          try {
            await window.dbAPI.saveSettings({ jarvisApiKey: keyJarvis.value.trim() });
            NRDToast.show({ type: 'success', title: 'Jarvis Key Saved', msg: 'Persisted into SQLite app_settings.' });
          } catch (err) {
            NRDToast.show({ type: 'error', title: 'Save failed', msg: err.message });
          } finally {
            btnSaveJarvis.disabled = false;
          }
        });
      }

      /* Load initial values from SQLite app_settings */
      if (window.dbAPI) {
        window.dbAPI.getSettings().then(async (dbSet) => {
          if (!dbSet) return;
          savedSettings = dbSet;
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
          if (keyJarvis && dbSet.jarvisApiKey) keyJarvis.value = dbSet.jarvisApiKey;

          if (dbSet.aiProvider && aiProviderSelect) {
            aiProviderSelect.value = dbSet.aiProvider;
            onProviderChanged();
          }

          // Check model status for warning banner if model unavailable
          if (window.llmAPI) {
            try {
              const status = await window.llmAPI.checkModelStatus();
              if (status && status.warning) {
                NRDToast.show({ type: 'warning', title: 'AI Model Warning', msg: status.warning });
                if (aiStatusBadge) {
                  aiStatusBadge.style.display = '';
                  aiStatusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
                  aiStatusBadge.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                  aiStatusBadge.style.color = '#f87171';
                  aiStatusBadge.innerHTML = `⚠️ <strong>Model Warning:</strong> ${status.warning}`;
                }
              }
            } catch {}
          }
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

      /* ═══════════════ System Tests Runner (P1.3c) ═══════════════ */
      const systemTestsGrid = document.getElementById('system-tests-grid');
      const btnRunAllSystemTests = document.getElementById('btn-run-all-system-tests');

      let systemTestFiles = [];

      const renderSystemTestsGrid = () => {
        if (!systemTestsGrid) return;
        systemTestsGrid.innerHTML = systemTestFiles.map((t) => {
          const statusColors = {
            'NOT RUN': 'badge-outline',
            'RUNNING': 'badge-amber',
            'PASS': 'badge-active',
            'FAIL': 'badge-danger',
          };
          const badgeCls = statusColors[t.status || 'NOT RUN'] || 'badge-outline';
          return `
            <div class="panel" style="padding:12px; background:var(--ink-900, #101014); border:1px solid var(--line); border-radius:8px; display:flex; flex-direction:column; justify-content:space-between; min-height:100px">
              <div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px">
                  <span style="font-size:12px; font-weight:600; color:var(--text-1)" title="${t.fileName}">${t.fileName}</span>
                  <span class="badge ${badgeCls}" style="font-size:9.5px" id="st-badge-${t.id}">${t.status || 'NOT RUN'}</span>
                </div>
                <div style="font-size:10.5px; color:var(--text-3); word-break:break-all">${t.label || t.fileName}</div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px">
                <span style="font-size:10px; color:var(--text-dim)" id="st-dur-${t.id}">${t.durationMs ? t.durationMs + 'ms' : ''}</span>
                <button class="btn btn-cu btn-sm btn-run-st" data-filename="${t.fileName}" data-id="${t.id}" style="padding:2px 8px; font-size:10.5px">Run</button>
              </div>
            </div>
          `;
        }).join('');

        // Wire individual run buttons
        systemTestsGrid.querySelectorAll('.btn-run-st').forEach((btn) => {
          btn.addEventListener('click', () => {
            const fileName = btn.dataset.filename;
            const tId = btn.dataset.id;
            runSingleSystemTest(fileName, tId);
          });
        });
      };

      const runSingleSystemTest = async (fileName, tId) => {
        if (!window.engineAPI) {
          NRDToast.show({ type: 'warning', title: 'System Tests', msg: 'System tests runner unavailable in browser preview.' });
          return;
        }

        const tItem = systemTestFiles.find(x => x.id === tId || x.fileName === fileName);
        if (tItem) tItem.status = 'RUNNING';
        renderSystemTestsGrid();

        logToConsole(`=== RUNNING SYSTEM TEST: ${fileName} ===`);

        const unsub = window.engineAPI.onSystemTestLog && window.engineAPI.onSystemTestLog((data) => {
          if (data.fileName === fileName) {
            logToConsole(`[${fileName}] ${data.chunk}`);
          }
        });

        try {
          const res = await window.engineAPI.runSystemTest(fileName);
          if (tItem) {
            tItem.status = res.passed ? 'PASS' : 'FAIL';
            tItem.durationMs = res.durationMs;
          }
          logToConsole(`[${fileName}] Complete — Exit Code ${res.exitCode} (${res.durationMs}ms)\n${res.stdout || ''}\n${res.stderr || ''}`);
          if (res.passed) {
            NRDToast.show({ type: 'success', title: 'System Test Passed', msg: `${fileName} passed (${res.durationMs}ms)` });
          } else {
            NRDToast.show({ type: 'error', title: 'System Test Failed', msg: `${fileName} exited with code ${res.exitCode}` });
          }
        } catch (err) {
          if (tItem) tItem.status = 'FAIL';
          logToConsole(`[${fileName}] Error: ${err.message}`);
          NRDToast.show({ type: 'error', title: 'System Test Error', msg: err.message });
        } finally {
          if (typeof unsub === 'function') unsub();
          renderSystemTestsGrid();
        }
      };

      if (window.engineAPI && window.engineAPI.listSystemTests) {
        window.engineAPI.listSystemTests().then((list) => {
          if (Array.isArray(list)) {
            systemTestFiles = list.map((t, idx) => ({ ...t, id: `st-${idx}`, status: 'NOT RUN' }));
            renderSystemTestsGrid();
          }
        }).catch(() => {});
      }

      if (btnRunAllSystemTests) {
        btnRunAllSystemTests.addEventListener('click', async () => {
          btnRunAllSystemTests.disabled = true;
          btnRunAllSystemTests.textContent = 'Running All Tests…';
          logToConsole(`=== STARTING ALL SYSTEM TESTS SUITE ===`);
          try {
            for (const t of systemTestFiles) {
              await runSingleSystemTest(t.fileName, t.id);
            }
            NRDToast.show({ type: 'info', title: 'Suite Complete', msg: 'All system tests executed.' });
          } finally {
            btnRunAllSystemTests.disabled = false;
            btnRunAllSystemTests.textContent = 'Run All System Tests';
          }
        });
      }
    },

    destroy() {
      if (this._unTheme) this._unTheme();
      if (this._unUpdater) this._unUpdater();
      if (this._unSlots) this._unSlots();
    },
  };

  window.NRDPages.settings = PAGE;
})();
