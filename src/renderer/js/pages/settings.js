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

              <div id="settings-model-warning-banner" style="display:none; margin-bottom:14px; padding:12px 16px; background:rgba(245, 158, 11, 0.12); border:1px solid rgba(245, 158, 11, 0.35); border-radius:8px; color:#fbbf24; font-size:12.5px; line-height:1.5;">
                <div style="display:flex; align-items:center; gap:8px; font-weight:600; margin-bottom:4px">
                  <span>⚠️ Selected AI Model Unavailable</span>
                </div>
                <div id="settings-model-warning-text" style="color:var(--text-2, #d1d5db); font-size:12px">
                  The previously selected model is no longer available from the provider. Please test connection and choose an active model below.
                </div>
              </div>
              
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

              <!-- ═══════════════ Jarvis Gateway Agent (Agent #5 - P1.5) ═══════════════ -->
              <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:14px" id="panel-jarvis-gateway">
                <div class="set-row" style="padding-bottom:8px">
                  <div style="flex:1">
                    <div style="display:flex; align-items:center; gap:8px">
                      <div class="sr-title" style="font-size:13.5px; font-weight:600; color:var(--text-1)">Jarvis Gateway Agent (Agent #5)</div>
                      <span id="jarvis-status-chip" class="badge" style="font-size:10px; padding:2px 8px; background:rgba(255,255,255,0.08); color:var(--text-3)">○ Stopped</span>
                    </div>
                    <div class="sr-desc" style="margin-top:2px">
                      External API Gateway and Companion App Orchestration bridge. Bound strictly to <code>127.0.0.1</code> with rate limiting and authenticated access.
                    </div>
                  </div>
                  <label class="toggle" title="Enable/Disable Jarvis Gateway Server">
                    <input type="checkbox" id="set-jarvis-enabled" />
                    <span class="track"><span class="thumb"></span></span>
                  </label>
                </div>

                <div style="display:grid; grid-template-columns:120px 1fr; gap:10px; margin-top:10px; margin-bottom:10px">
                  <div>
                    <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Gateway Port</label>
                    <input class="input" id="set-jarvis-port" type="number" min="1024" max="65535" value="47821" style="width:100%; font-size:12px; font-family:monospace" />
                  </div>
                  <div>
                    <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Secret Access Key (X-Jarvis-Key)</label>
                    <div class="api-row" style="margin:0">
                      <input class="input" id="key-jarvis" type="password" placeholder="sk_jarvis_…" style="font-family:monospace; font-size:12px" />
                      <button class="btn btn-outline" id="btn-toggle-jarvis-key" type="button" style="font-size:11px">Show</button>
                      <button class="btn btn-outline" id="btn-paste-jarvis" type="button" style="font-size:11px">Paste</button>
                      <button class="btn btn-outline" id="btn-generate-jarvis" type="button" style="font-size:11px; color:var(--cu-soft)">⚡ Generate</button>
                    </div>
                  </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px">
                  <span id="jarvis-port-error" style="display:none; color:#f87171; font-size:11px">⚠️ Port is currently in use by another service.</span>
                  <div style="margin-left:auto; display:flex; gap:8px">
                    <button class="btn btn-cu" id="btn-save-jarvis" type="button" style="font-size:11.5px; padding:4px 14px">Save Jarvis Configuration</button>
                  </div>
                </div>

                <!-- Developer Quick-Start & cURL Example -->
                <div style="margin-top:12px; padding:10px 12px; background:var(--ink-950, #09090b); border:1px solid var(--line); border-radius:6px">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
                    <span style="font-size:10.5px; font-weight:600; color:var(--text-2); text-transform:uppercase; letter-spacing:0.5px">Quick-Start Integration (cURL)</span>
                    <button class="btn btn-ghost" id="btn-copy-jarvis-curl" type="button" style="padding:2px 6px; font-size:10.5px">📋 Copy cURL</button>
                  </div>
                  <pre id="jarvis-curl-preview" style="margin:0; font-size:11px; font-family:monospace; color:var(--text-cu, #c084fc); white-space:pre-wrap; word-break:break-all">curl -X GET http://127.0.0.1:47821/v1/ping -H "X-Jarvis-Key: sk_jarvis_..."</pre>
                </div>

                <!-- Mini Incoming Requests Log (Audit Trail) -->
                <div style="margin-top:12px">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
                    <span style="font-size:11px; font-weight:600; color:var(--text-2)">Recent Incoming Gateway Requests</span>
                    <button class="btn btn-ghost" id="btn-refresh-jarvis-requests" type="button" style="padding:2px 6px; font-size:10.5px">Refresh</button>
                  </div>
                  <div id="jarvis-requests-list" style="max-height:120px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; font-size:11px">
                    <div style="color:var(--text-dim); padding:4px 0">No incoming API requests received yet.</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ═══════════════ Scheduler Agent (Agent #4 - P1.4) ═══════════════ -->
            <div class="panel panel-pad" id="panel-scheduler">
              <div class="section-label" style="display:flex; align-items:center; justify-content:space-between">
                <span>Scheduler Agent (Agent #4)</span>
                <div style="display:flex; gap:8px">
                  <button class="btn btn-outline" id="btn-refresh-schedules" style="padding:3px 8px; font-size:11px">Refresh</button>
                  <button class="btn btn-cu" id="btn-create-schedule" style="padding:3px 10px; font-size:11px">+ New Schedule</button>
                </div>
              </div>
              <div style="font-size:12px; color:var(--text-3); margin-bottom:12px">
                Automate recurring research runs on interval, daily, weekly, or cron cadences. The 30s engine loop checks for due tasks with missed-fire catch-up and concurrency protection.
              </div>

              <!-- Create / Edit Form Modal/Drawer Area -->
              <div id="scheduler-form-card" style="display:none; margin-bottom:14px; padding:14px; background:var(--ink-950, #09090b); border:1px solid var(--border-cu, rgba(147, 51, 234, 0.3)); border-radius:8px">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                  <span id="scheduler-form-title" style="font-size:12.5px; font-weight:600; color:var(--text-1)">Create Automated Research Schedule</span>
                  <button class="btn btn-ghost" id="btn-close-schedule-form" style="padding:2px 6px; font-size:11px">✕</button>
                </div>
                <input type="hidden" id="sched-id" value="" />
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
                  <div>
                    <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Schedule Name</label>
                    <input class="input" id="sched-name" placeholder="e.g. Daily Tech Radar" style="width:100%; font-size:12px" />
                  </div>
                  <div>
                    <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Cadence Type</label>
                    <select class="select" id="sched-type" style="width:100%; font-size:12px">
                      <option value="interval">Interval (Minutes)</option>
                      <option value="daily">Daily (Time of Day)</option>
                      <option value="weekly">Weekly (Day + Time)</option>
                      <option value="cron">Cron Expression (5-part)</option>
                    </select>
                  </div>
                </div>

                <!-- Type-specific options -->
                <div id="sched-opt-interval" style="margin-bottom:10px">
                  <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Interval (Minutes)</label>
                  <input class="input" id="sched-interval" type="number" min="1" value="60" style="width:100%; font-size:12px" />
                </div>

                <div id="sched-opt-daily" style="display:none; margin-bottom:10px">
                  <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Time of Day (HH:MM)</label>
                  <input class="input" id="sched-time-daily" type="time" value="09:00" style="width:100%; font-size:12px" />
                </div>

                <div id="sched-opt-weekly" style="display:none; margin-bottom:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px">
                  <div>
                    <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Day of Week</label>
                    <select class="select" id="sched-dow" style="width:100%; font-size:12px">
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                      <option value="0">Sunday</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Time (HH:MM)</label>
                    <input class="input" id="sched-time-weekly" type="time" value="09:00" style="width:100%; font-size:12px" />
                  </div>
                </div>

                <div id="sched-opt-cron" style="display:none; margin-bottom:10px">
                  <label style="font-size:11px; color:var(--text-2); display:block; margin-bottom:4px">Cron Expression (min hour dom mon dow)</label>
                  <input class="input" id="sched-cron" placeholder="0 0 * * *" value="0 9 * * 1-5" style="width:100%; font-size:12px; font-family:monospace" />
                  <div style="font-size:10px; color:var(--text-dim); margin-top:2px">Example: "0 9 * * 1-5" = Weekdays at 9:00 AM</div>
                </div>

                <!-- Run Config Parameters Unified with New Research -->
                <div style="border-top:1px solid var(--border); padding-top:10px; margin-top:10px; margin-bottom:12px">
                  <div style="font-size:11px; font-weight:600; color:var(--text-2); margin-bottom:8px">Automated Commission Parameters:</div>
                  
                  <!-- Input Mode & Mode Specific Criteria -->
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px">
                    <div>
                      <label style="font-size:10.5px; color:var(--text-3); display:block; margin-bottom:2px">Input Mode</label>
                      <select class="select" id="sched-input-mode" style="width:100%; font-size:11.5px">
                        <option value="discovery">Discovery (Autonomous Swarm)</option>
                        <option value="own_niche">Own Niche (Target Validation)</option>
                        <option value="own_domain">Own Domain (Domain Fit)</option>
                      </select>
                    </div>
                    <div>
                      <label style="font-size:10.5px; color:var(--text-3); display:block; margin-bottom:2px">Niche Quantity Target</label>
                      <input class="input" id="sched-niche-qty" type="number" min="1" max="10" value="1" style="width:100%; font-size:11.5px" />
                    </div>
                  </div>

                  <!-- Conditional Mode Specific Inputs -->
                  <div id="sched-mode-own-niche-box" style="display:none; margin-bottom:10px">
                    <label style="font-size:10.5px; color:var(--text-3); display:block; margin-bottom:2px">Target Niche Name</label>
                    <input class="input" id="sched-own-niche-name" placeholder="e.g. Mechanical Keyboards, Ergonomic Desks…" style="width:100%; font-size:11.5px" />
                  </div>

                  <div id="sched-mode-own-domain-box" style="display:none; margin-bottom:10px">
                    <label style="font-size:10.5px; color:var(--text-3); display:block; margin-bottom:2px">Target Domain</label>
                    <input class="input" id="sched-domain-input" placeholder="e.g. keychron.com, yourstore.io" style="width:100%; font-size:11.5px" />
                  </div>

                  <!-- Business Monetization Models (4 Multi-Select Cards) -->
                  <div style="margin-bottom:10px">
                    <label style="font-size:10.5px; color:var(--text-3); display:block; margin-bottom:4px">Monetization &amp; Business Models (At least 1 required)</label>
                    <div class="biz-cards" id="sched-biz-cards-grid" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px">
                      <button class="biz-card selected" data-biz="blogging" type="button" style="text-align:left; padding:8px 10px">
                        <div style="display:flex; align-items:center; gap:8px">
                          <span style="font-size:16px">✍️</span>
                          <div style="flex:1; min-width:0">
                            <h5 style="margin:0; font-size:11.5px" class="text-truncate">Blogging / Ads</h5>
                          </div>
                          <span class="bc-check" style="font-size:10px">✓</span>
                        </div>
                      </button>
                      <button class="biz-card selected" data-biz="affiliate" type="button" style="text-align:left; padding:8px 10px">
                        <div style="display:flex; align-items:center; gap:8px">
                          <span style="font-size:16px">🔗</span>
                          <div style="flex:1; min-width:0">
                            <h5 style="margin:0; font-size:11.5px" class="text-truncate">Affiliate</h5>
                          </div>
                          <span class="bc-check" style="font-size:10px">✓</span>
                        </div>
                      </button>
                      <button class="biz-card selected" data-biz="ecommerce" type="button" style="text-align:left; padding:8px 10px">
                        <div style="display:flex; align-items:center; gap:8px">
                          <span style="font-size:16px">🛒</span>
                          <div style="flex:1; min-width:0">
                            <h5 style="margin:0; font-size:11.5px" class="text-truncate">E-commerce</h5>
                          </div>
                          <span class="bc-check" style="font-size:10px">✓</span>
                        </div>
                      </button>
                      <button class="biz-card selected" data-biz="digital_products" type="button" style="text-align:left; padding:8px 10px">
                        <div style="display:flex; align-items:center; gap:8px">
                          <span style="font-size:16px">📱</span>
                          <div style="flex:1; min-width:0">
                            <h5 style="margin:0; font-size:11.5px" class="text-truncate">Digital Prod</h5>
                          </div>
                          <span class="bc-check" style="font-size:10px">✓</span>
                        </div>
                      </button>
                    </div>
                    <div id="sched-biz-error-msg" style="display:none; color:#f87171; font-size:10.5px; margin-top:4px">Please select at least one business model.</div>
                  </div>

                  <!-- Target Country Selection (Mount Reusable Country Selector) -->
                  <div style="margin-bottom:10px">
                    <label style="font-size:10.5px; color:var(--text-3); display:block; margin-bottom:4px">Target Country Intelligence</label>
                    <div id="sched-country-mount" style="background:var(--ink-900, #121214); border:1px solid var(--line); border-radius:6px; padding:8px"></div>
                  </div>

                  <div style="margin-top:8px; display:flex; align-items:center; gap:8px">
                    <label class="toggle" style="scale:0.8; transform-origin:left center">
                      <input type="checkbox" id="sched-auto-approve" checked />
                      <span class="track"><span class="thumb"></span></span>
                    </label>
                    <span style="font-size:11px; color:var(--text-2)">Auto-approve pipeline (run unattended)</span>
                  </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:8px">
                  <button class="btn btn-outline" id="btn-cancel-schedule" style="font-size:11px; padding:4px 10px">Cancel</button>
                  <button class="btn btn-cu" id="btn-save-schedule" style="font-size:11px; padding:4px 14px">Save Schedule</button>
                </div>
              </div>

              <!-- Schedules Table / List -->
              <div id="schedules-list-container" style="display:flex; flex-direction:column; gap:8px">
                <!-- Dynamically rendered schedule cards -->
                <div style="text-align:center; padding:18px; color:var(--text-dim); font-size:12px">Loading schedules…</div>
              </div>

              <!-- Recent Schedule Firings Drawer/List -->
              <div style="margin-top:14px; border-top:1px solid var(--border); padding-top:10px">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                  <span style="font-size:11.5px; font-weight:600; color:var(--text-2)">Recent Scheduler Firings Log</span>
                </div>
                <div id="scheduler-firings-list" style="max-height:140px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; font-size:11px">
                  <div style="color:var(--text-dim); padding:6px 0">No recent automated firings recorded yet.</div>
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

      const escapeHtml = (str) => {
        if (typeof str !== 'string') return String(str || '');
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const renderAiErrorBox = (targetEl, errObj) => {
        targetEl.style.display = '';
        targetEl.style.background = 'rgba(239, 68, 68, 0.12)';
        targetEl.style.border = '1px solid rgba(239, 68, 68, 0.35)';
        targetEl.style.borderRadius = '8px';
        targetEl.style.padding = '12px 14px';
        targetEl.style.marginTop = '12px';

        const providerMsg = errObj.providerMessage || errObj.message || errObj.error || 'Connection failure';
        const hint = errObj.hint || 'Provider dashboard se sahi key aur permissions verify karein.';
        const code = errObj.errorCode || (errObj.status ? `HTTP ${errObj.status}` : 'ERR');

        targetEl.innerHTML = `
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">
            <div style="font-weight:600;color:#f87171;font-size:13px;line-height:1.4;">
              ❌ ${escapeHtml(providerMsg)}
            </div>
            <span style="font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(239, 68, 68, 0.2);color:#fca5a5;font-family:monospace;white-space:nowrap;">
              ${escapeHtml(code)}
            </span>
          </div>
          <div style="color:var(--text-muted, #94a3b8);font-size:12px;line-height:1.4;margin-top:4px;">
            💡 <strong>Hint:</strong> ${escapeHtml(hint)}
          </div>
        `;
      };

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
            if (!res.ok) {
              renderAiErrorBox(aiErrorBox, res);
              NRDToast.show({
                type: 'error',
                title: 'Connection Failed',
                msg: res.providerMessage || res.error || 'Failed to fetch models',
              });
              return;
            }

            currentFetchedModels = res.models || [];
            aiModelSelect.innerHTML = currentFetchedModels.map((m) => {
              const freeBadge = m.isFreeTier ? ' [FREE TIER]' : ' [PAID]';
              return `<option value="${m.id}">${m.name} (${m.id})${freeBadge}</option>`;
            }).join('');

            // Preselect saved model if matched
            if (savedSettings.aiModel && currentFetchedModels.some(m => m.id === savedSettings.aiModel)) {
              aiModelSelect.value = savedSettings.aiModel;
            }

            aiErrorBox.style.display = 'none';
            aiModelContainer.style.display = '';
            setApiKeyFieldForProvider(pId, key);
            NRDToast.show({ type: 'success', title: 'Models Fetched', msg: `Found ${currentFetchedModels.length} models from live API call.` });
          } catch (err) {
            renderAiErrorBox(aiErrorBox, {
              providerMessage: err.message,
              errorCode: 'IPC_ERROR',
              hint: 'Check that Electron main process and background services are running.',
            });
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
              aiModelInvalid: 0,
              ai_model_invalid: 0,
              aiModelInvalidReason: '',
              ai_model_invalid_reason: '',
              geminiApiKey: savedSettings.geminiApiKey || '',
              openaiApiKey: savedSettings.openaiApiKey || '',
              anthropicApiKey: savedSettings.anthropicApiKey || '',
              groqApiKey: savedSettings.groqApiKey || '',
            };

            await window.dbAPI.saveSettings(patch);
            savedSettings = { ...savedSettings, ...patch };

            const modelWarnBanner = document.getElementById('settings-model-warning-banner');
            if (modelWarnBanner) modelWarnBanner.style.display = 'none';

            if (!valRes.ok && !valRes.success) {
              aiStatusBadge.style.display = '';
              if (valRes.isBillingError) {
                aiStatusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
                aiStatusBadge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
                aiStatusBadge.style.color = '#f59e0b';
                aiStatusBadge.innerHTML = `⚠️ <strong>Model Warning (${valRes.errorCode || valRes.status}):</strong> ${escapeHtml(valRes.providerMessage || valRes.error)}<br><span style="font-size:11.5px;opacity:0.9;">💡 ${escapeHtml(valRes.hint || 'Billing setup required or switch to a free-tier model.')}</span>`;
              } else {
                aiStatusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
                aiStatusBadge.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                aiStatusBadge.style.color = '#f87171';
                aiStatusBadge.innerHTML = `❌ <strong>Validation Error (${valRes.errorCode || valRes.status}):</strong> ${escapeHtml(valRes.providerMessage || valRes.error)}<br><span style="font-size:11.5px;opacity:0.9;">💡 ${escapeHtml(valRes.hint || 'Check provider API credentials.')}</span>`;
              }
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
          const pId = aiProviderSelect.value;
          const modelId = aiModelSelect.value;
          const key = aiProviderKey.value.trim();

          btnSendAiTest.disabled = true;
          aiTestOutput.style.display = '';
          aiTestOutput.textContent = 'Sending prompt to AI model…';

          try {
            if (!window.llmAPI) throw new Error('llmAPI unavailable');
            const res = await window.llmAPI.chat({
              providerId: pId,
              modelId: modelId,
              apiKey: key,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3,
              maxTokens: 150,
            });

            if (!res.ok && !res.success) {
              aiTestOutput.innerHTML = `
                <div style="color:#f87171;font-weight:600;margin-bottom:4px;">❌ Error (${res.status || res.errorCode}): ${escapeHtml(res.providerMessage || res.error)}</div>
                <div style="color:var(--text-muted, #94a3b8);font-size:12px;">💡 Hint: ${escapeHtml(res.hint || 'Check your key and connection.')}</div>
              `;
            } else {
              aiTestOutput.textContent = `[${res.model || modelId}] Response (${res.latencyMs}ms, ${res.usage?.totalTokens || 0} tokens):\n${res.content}`;
            }
          } catch (err) {
            aiTestOutput.textContent = `Error: ${err.message}`;
          } finally {
            btnSendAiTest.disabled = false;
          }
        });
      }

      // Jarvis Gateway Agent (Agent #5 - P1.5) UI Controller
      const setJarvisEnabled = document.getElementById('set-jarvis-enabled');
      const setJarvisPort = document.getElementById('set-jarvis-port');
      const btnToggleJarvisKey = document.getElementById('btn-toggle-jarvis-key');
      const btnGenerateJarvis = document.getElementById('btn-generate-jarvis');
      const btnCopyJarvisCurl = document.getElementById('btn-copy-jarvis-curl');
      const jarvisStatusChip = document.getElementById('jarvis-status-chip');
      const jarvisPortError = document.getElementById('jarvis-port-error');
      const jarvisCurlPreview = document.getElementById('jarvis-curl-preview');
      const jarvisRequestsList = document.getElementById('jarvis-requests-list');
      const btnRefreshJarvisRequests = document.getElementById('btn-refresh-jarvis-requests');

      const updateJarvisCurlPreview = () => {
        if (!jarvisCurlPreview) return;
        const port = setJarvisPort ? (parseInt(setJarvisPort.value, 10) || 47821) : 47821;
        const key = keyJarvis && keyJarvis.value.trim() ? keyJarvis.value.trim() : 'sk_jarvis_...';
        jarvisCurlPreview.textContent = `curl -X GET http://127.0.0.1:${port}/v1/ping \\\n  -H "X-Jarvis-Key: ${key}"`;
      };

      const updateJarvisStatusUI = (status = {}) => {
        if (!jarvisStatusChip) return;
        const port = status.port || (setJarvisPort ? parseInt(setJarvisPort.value, 10) : 47821) || 47821;

        if (status.running) {
          jarvisStatusChip.className = 'badge badge-active';
          jarvisStatusChip.style.background = 'rgba(34,197,94,0.15)';
          jarvisStatusChip.style.color = '#4ade80';
          jarvisStatusChip.innerHTML = `● Running on 127.0.0.1:${port}`;
          if (jarvisPortError) jarvisPortError.style.display = 'none';
        } else if (status.portBusy) {
          jarvisStatusChip.className = 'badge';
          jarvisStatusChip.style.background = 'rgba(239,68,68,0.15)';
          jarvisStatusChip.style.color = '#f87171';
          jarvisStatusChip.innerHTML = `⚠️ Port ${port} Busy`;
          if (jarvisPortError) {
            jarvisPortError.style.display = 'block';
            jarvisPortError.textContent = `⚠️ Port ${port} is currently in use by another process.`;
          }
        } else {
          jarvisStatusChip.className = 'badge';
          jarvisStatusChip.style.background = 'rgba(255,255,255,0.08)';
          jarvisStatusChip.style.color = 'var(--text-3)';
          jarvisStatusChip.innerHTML = '○ Stopped';
          if (jarvisPortError) jarvisPortError.style.display = 'none';
        }

        if (setJarvisEnabled && status.enabled !== undefined) {
          setJarvisEnabled.checked = Boolean(status.enabled);
        }
        if (setJarvisPort && status.port) {
          setJarvisPort.value = status.port;
        }
        updateJarvisCurlPreview();
      };

      const loadJarvisRequests = async () => {
        if (!jarvisRequestsList || !window.jarvisAPI || !window.jarvisAPI.getRecentRequests) return;
        try {
          const reqs = await window.jarvisAPI.getRecentRequests(10);
          if (!Array.isArray(reqs) || reqs.length === 0) {
            jarvisRequestsList.innerHTML = `<div style="color:var(--text-dim); padding:4px 0">No incoming API requests received yet.</div>`;
            return;
          }

          jarvisRequestsList.innerHTML = reqs.map((r) => {
            const isOk = r.status_code >= 200 && r.status_code < 300;
            const isWarn = r.status_code >= 400 && r.status_code < 500;
            const color = isOk ? '#4ade80' : isWarn ? '#fbbf24' : '#f87171';
            const bg = isOk ? 'rgba(34,197,94,0.12)' : isWarn ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
            const methodBg = r.method === 'POST' ? 'rgba(147,51,234,0.2)' : 'rgba(59,130,246,0.15)';
            const methodColor = r.method === 'POST' ? '#c084fc' : '#60a5fa';

            return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 8px; background:var(--ink-950, #09090b); border:1px solid var(--border); border-radius:4px; font-size:10.5px">
                <div style="display:flex; align-items:center; gap:6px">
                  <span style="background:${methodBg}; color:${methodColor}; font-weight:600; padding:1px 5px; border-radius:3px; font-size:9.5px">${r.method}</span>
                  <span style="font-family:monospace; color:var(--text-1)">${escapeHtml(r.path)}</span>
                  <span style="background:${bg}; color:${color}; font-weight:600; padding:1px 5px; border-radius:3px; font-size:9.5px">${r.status_code}</span>
                  <span style="color:var(--text-3); font-size:9.5px">${r.duration_ms || 0}ms</span>
                </div>
                <span style="color:var(--text-dim); font-size:9.5px">${r.created_at ? new Date(r.created_at).toLocaleTimeString() : ''}</span>
              </div>
            `;
          }).join('');
        } catch (err) {
          console.warn('[jarvis] Failed to load request log:', err.message);
        }
      };

      if (btnToggleJarvisKey && keyJarvis) {
        btnToggleJarvisKey.addEventListener('click', () => {
          if (keyJarvis.type === 'password') {
            keyJarvis.type = 'text';
            btnToggleJarvisKey.textContent = 'Hide';
          } else {
            keyJarvis.type = 'password';
            btnToggleJarvisKey.textContent = 'Show';
          }
        });
      }

      if (btnGenerateJarvis && keyJarvis) {
        btnGenerateJarvis.addEventListener('click', async () => {
          if (window.jarvisAPI && window.jarvisAPI.generateApiKey) {
            const newKey = await window.jarvisAPI.generateApiKey();
            keyJarvis.value = newKey;
            updateJarvisCurlPreview();
            NRDToast.show({ type: 'info', title: 'New Key Generated', msg: 'Remember to save configuration to persist.' });
          }
        });
      }

      if (btnPasteJarvis && keyJarvis) {
        btnPasteJarvis.addEventListener('click', async () => {
          try {
            const txt = await navigator.clipboard.readText();
            if (txt) {
              keyJarvis.value = txt.trim();
              updateJarvisCurlPreview();
            }
          } catch {
            NRDToast.show({ type: 'warning', title: 'Clipboard unavailable', msg: 'Please paste manually into the field.' });
          }
        });
      }

      if (btnCopyJarvisCurl && jarvisCurlPreview) {
        btnCopyJarvisCurl.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(jarvisCurlPreview.textContent);
            NRDToast.show({ type: 'success', title: 'Copied to Clipboard', msg: 'cURL command copied.' });
          } catch {
            NRDToast.show({ type: 'warning', title: 'Clipboard unavailable', msg: 'Select and copy text manually.' });
          }
        });
      }

      if (keyJarvis) {
        keyJarvis.addEventListener('input', updateJarvisCurlPreview);
      }
      if (setJarvisPort) {
        setJarvisPort.addEventListener('input', updateJarvisCurlPreview);
      }

      if (btnRefreshJarvisRequests) {
        btnRefreshJarvisRequests.addEventListener('click', loadJarvisRequests);
      }

      const saveJarvisConfigHandler = async () => {
        if (!window.jarvisAPI) return;
        if (btnSaveJarvis) {
          btnSaveJarvis.disabled = true;
          btnSaveJarvis.textContent = 'Saving…';
        }

        try {
          const enabled = setJarvisEnabled ? setJarvisEnabled.checked : false;
          const port = setJarvisPort ? (parseInt(setJarvisPort.value, 10) || 47821) : 47821;
          const apiKey = keyJarvis ? keyJarvis.value.trim() : '';

          const res = await window.jarvisAPI.saveConfig({ enabled, port, apiKey });
          updateJarvisStatusUI(res.status);
          loadJarvisRequests();

          NRDToast.show({
            type: 'success',
            title: 'Jarvis Gateway Config Saved',
            msg: enabled ? `Gateway active on 127.0.0.1:${port}` : 'Gateway disabled and stopped.',
          });
        } catch (err) {
          NRDToast.show({ type: 'error', title: 'Save Failed', msg: err.message });
        } finally {
          if (btnSaveJarvis) {
            btnSaveJarvis.disabled = false;
            btnSaveJarvis.textContent = 'Save Jarvis Configuration';
          }
        }
      };

      if (btnSaveJarvis) {
        btnSaveJarvis.addEventListener('click', saveJarvisConfigHandler);
      }

      if (setJarvisEnabled) {
        setJarvisEnabled.addEventListener('change', saveJarvisConfigHandler);
      }

      // Initial status load
      if (window.jarvisAPI && window.jarvisAPI.getStatus) {
        window.jarvisAPI.getStatus().then((status) => {
          updateJarvisStatusUI(status);
          loadJarvisRequests();
        }).catch(() => {});
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
          const bannerEl = document.getElementById('settings-model-warning-banner');
          const bannerTextEl = document.getElementById('settings-model-warning-text');

          const showWarning = (warnMsg) => {
            if (bannerEl) {
              bannerEl.style.display = 'block';
              if (bannerTextEl) {
                bannerTextEl.textContent = warnMsg || 'Your selected model is no longer available. Please test connection and select an active model.';
              }
            }
            if (aiStatusBadge) {
              aiStatusBadge.style.display = '';
              aiStatusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
              aiStatusBadge.style.border = '1px solid rgba(245, 158, 11, 0.4)';
              aiStatusBadge.style.color = '#fbbf24';
              aiStatusBadge.innerHTML = `⚠️ <strong>Model Warning:</strong> ${escapeHtml(warnMsg)}`;
            }
          };

          if (dbSet.aiModelInvalid || dbSet.ai_model_invalid) {
            const reason = dbSet.aiModelInvalidReason || dbSet.ai_model_invalid_reason || 'Selected AI model is no longer available.';
            showWarning(reason);
          }

          if (window.llmAPI) {
            try {
              const status = await window.llmAPI.checkModelStatus();
              if (status && status.warning) {
                NRDToast.show({ type: 'warning', title: 'AI Model Warning', msg: status.warning });
                showWarning(status.warning);
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

      /* ══════════════════════════════════════════════════════════════
         SCHEDULER AGENT UI CONTROLLER (Agent #4 - P1.4)
         ══════════════════════════════════════════════════════════════ */
      const schedListContainer = document.getElementById('schedules-list-container');
      const schedFiringsList = document.getElementById('scheduler-firings-list');
      const schedFormCard = document.getElementById('scheduler-form-card');
      const schedFormTitle = document.getElementById('scheduler-form-title');
      const btnCreateSchedule = document.getElementById('btn-create-schedule');
      const btnRefreshSchedules = document.getElementById('btn-refresh-schedules');
      const btnCloseScheduleForm = document.getElementById('btn-close-schedule-form');
      const btnCancelSchedule = document.getElementById('btn-cancel-schedule');
      const btnSaveSchedule = document.getElementById('btn-save-schedule');

      const schedIdInput = document.getElementById('sched-id');
      const schedNameInput = document.getElementById('sched-name');
      const schedTypeSelect = document.getElementById('sched-type');
      const schedIntervalInput = document.getElementById('sched-interval');
      const schedTimeDailyInput = document.getElementById('sched-time-daily');
      const schedDowSelect = document.getElementById('sched-dow');
      const schedTimeWeeklyInput = document.getElementById('sched-time-weekly');
      const schedCronInput = document.getElementById('sched-cron');
      
      const schedInputModeSelect = document.getElementById('sched-input-mode');
      const schedNicheQtyInput = document.getElementById('sched-niche-qty');
      const schedOwnNicheBox = document.getElementById('sched-mode-own-niche-box');
      const schedOwnNicheName = document.getElementById('sched-own-niche-name');
      const schedOwnDomainBox = document.getElementById('sched-mode-own-domain-box');
      const schedDomainInput = document.getElementById('sched-domain-input');
      const schedBizCardsGrid = document.getElementById('sched-biz-cards-grid');
      const schedBizErrorMsg = document.getElementById('sched-biz-error-msg');
      const schedCountryMount = document.getElementById('sched-country-mount');
      const schedAutoApproveInput = document.getElementById('sched-auto-approve');

      const schedOptInterval = document.getElementById('sched-opt-interval');
      const schedOptDaily = document.getElementById('sched-opt-daily');
      const schedOptWeekly = document.getElementById('sched-opt-weekly');
      const schedOptCron = document.getElementById('sched-opt-cron');

      let currentSchedulesList = [];
      let schedSelectedBizModes = new Set(['blogging', 'affiliate', 'ecommerce', 'digital_products']);
      let schedCountrySelectorInstance = null;
      let schedSelectedCountries = ['US'];

      // Mount Country Selector for Scheduler Form
      if (window.NRDCountrySelector && schedCountryMount) {
        schedCountrySelectorInstance = window.NRDCountrySelector.create({
          container: '#sched-country-mount',
          initialSelected: ['US'],
          onChange: (selectedCodes) => {
            schedSelectedCountries = selectedCodes.length > 0 ? selectedCodes : ['US'];
          },
        });
      }

      // Sync Business Mode Card Visuals
      const syncBizCardVisuals = () => {
        if (!schedBizCardsGrid) return;
        const cards = schedBizCardsGrid.querySelectorAll('.biz-card');
        cards.forEach((card) => {
          const biz = card.dataset.biz;
          const isSel = schedSelectedBizModes.has(biz);
          card.classList.toggle('selected', isSel);
          const check = card.querySelector('.bc-check');
          if (check) check.style.visibility = isSel ? 'visible' : 'hidden';
        });

        if (schedBizErrorMsg) {
          schedBizErrorMsg.style.display = schedSelectedBizModes.size === 0 ? 'block' : 'none';
        }
      };

      if (schedBizCardsGrid) {
        schedBizCardsGrid.querySelectorAll('.biz-card').forEach((card) => {
          card.addEventListener('click', () => {
            const biz = card.dataset.biz;
            if (schedSelectedBizModes.has(biz)) {
              schedSelectedBizModes.delete(biz);
            } else {
              schedSelectedBizModes.add(biz);
            }
            syncBizCardVisuals();
          });
        });
      }

      const syncScheduleModeInputs = () => {
        const mode = schedInputModeSelect ? schedInputModeSelect.value : 'discovery';
        if (schedOwnNicheBox) schedOwnNicheBox.style.display = mode === 'own_niche' ? 'block' : 'none';
        if (schedOwnDomainBox) schedOwnDomainBox.style.display = mode === 'own_domain' ? 'block' : 'none';
      };

      if (schedInputModeSelect) {
        schedInputModeSelect.addEventListener('change', syncScheduleModeInputs);
      }

      const syncScheduleTypeVisibility = () => {
        const type = schedTypeSelect ? schedTypeSelect.value : 'interval';
        if (schedOptInterval) schedOptInterval.style.display = type === 'interval' ? 'block' : 'none';
        if (schedOptDaily) schedOptDaily.style.display = type === 'daily' ? 'block' : 'none';
        if (schedOptWeekly) schedOptWeekly.style.display = type === 'weekly' ? 'grid' : 'none';
        if (schedOptCron) schedOptCron.style.display = type === 'cron' ? 'block' : 'none';
      };

      if (schedTypeSelect) {
        schedTypeSelect.addEventListener('change', syncScheduleTypeVisibility);
      }

      const openScheduleForm = (schedule = null) => {
        if (!schedFormCard) return;
        schedFormCard.style.display = 'block';

        if (schedule) {
          if (schedFormTitle) schedFormTitle.textContent = `Edit Schedule: ${schedule.name}`;
          if (schedIdInput) schedIdInput.value = schedule.id;
          if (schedNameInput) schedNameInput.value = schedule.name;
          if (schedTypeSelect) schedTypeSelect.value = schedule.schedule_type;
          if (schedIntervalInput) schedIntervalInput.value = schedule.interval_minutes || 60;
          if (schedTimeDailyInput) schedTimeDailyInput.value = schedule.time_of_day || '09:00';
          if (schedDowSelect) schedDowSelect.value = schedule.day_of_week !== null ? schedule.day_of_week : 1;
          if (schedTimeWeeklyInput) schedTimeWeeklyInput.value = schedule.time_of_day || '09:00';
          if (schedCronInput) schedCronInput.value = schedule.cron_expr || '0 9 * * 1-5';

          const cfg = schedule.run_config || {};
          if (schedInputModeSelect) schedInputModeSelect.value = cfg.input_mode || 'discovery';
          if (schedNicheQtyInput) schedNicheQtyInput.value = cfg.niche_quantity || 1;
          if (schedOwnNicheName) schedOwnNicheName.value = cfg.niche_name || '';
          if (schedDomainInput) schedDomainInput.value = cfg.domain || '';
          if (schedAutoApproveInput) schedAutoApproveInput.checked = cfg.auto_approve !== undefined ? cfg.auto_approve : true;

          // Business Modes
          const modes = Array.isArray(cfg.business_modes) && cfg.business_modes.length > 0
            ? cfg.business_modes
            : ['blogging', 'affiliate', 'ecommerce', 'digital_products'];
          schedSelectedBizModes = new Set(modes);
          syncBizCardVisuals();

          // Country Codes
          const cCodes = Array.isArray(cfg.country_codes) && cfg.country_codes.length > 0
            ? cfg.country_codes
            : ['US'];
          schedSelectedCountries = cCodes;
          if (schedCountrySelectorInstance && typeof schedCountrySelectorInstance.setSelected === 'function') {
            schedCountrySelectorInstance.setSelected(cCodes);
          }
        } else {
          if (schedFormTitle) schedFormTitle.textContent = 'Create Automated Research Schedule';
          if (schedIdInput) schedIdInput.value = '';
          if (schedNameInput) schedNameInput.value = '';
          if (schedTypeSelect) schedTypeSelect.value = 'interval';
          if (schedIntervalInput) schedIntervalInput.value = 60;
          if (schedTimeDailyInput) schedTimeDailyInput.value = '09:00';
          if (schedDowSelect) schedDowSelect.value = 1;
          if (schedTimeWeeklyInput) schedTimeWeeklyInput.value = '09:00';
          if (schedCronInput) schedCronInput.value = '0 9 * * 1-5';
          
          if (schedInputModeSelect) schedInputModeSelect.value = 'discovery';
          if (schedNicheQtyInput) schedNicheQtyInput.value = 1;
          if (schedOwnNicheName) schedOwnNicheName.value = '';
          if (schedDomainInput) schedDomainInput.value = '';
          if (schedAutoApproveInput) schedAutoApproveInput.checked = true;

          schedSelectedBizModes = new Set(['blogging', 'affiliate', 'ecommerce', 'digital_products']);
          syncBizCardVisuals();

          schedSelectedCountries = ['US'];
          if (schedCountrySelectorInstance && typeof schedCountrySelectorInstance.setSelected === 'function') {
            schedCountrySelectorInstance.setSelected(['US']);
          }
        }

        syncScheduleTypeVisibility();
        syncScheduleModeInputs();
      };

      const closeScheduleForm = () => {
        if (schedFormCard) schedFormCard.style.display = 'none';
      };

      if (btnCreateSchedule) btnCreateSchedule.addEventListener('click', () => openScheduleForm(null));
      if (btnCloseScheduleForm) btnCloseScheduleForm.addEventListener('click', closeScheduleForm);
      if (btnCancelSchedule) btnCancelSchedule.addEventListener('click', closeScheduleForm);

      const renderSchedulesList = () => {
        if (!schedListContainer) return;
        if (!currentSchedulesList || currentSchedulesList.length === 0) {
          schedListContainer.innerHTML = `
            <div style="text-align:center; padding:18px; color:var(--text-dim); font-size:12px; border:1px dashed var(--line); border-radius:8px">
              No schedules created yet. Click <strong>+ New Schedule</strong> above to automate recurring market discovery.
            </div>
          `;
          return;
        }

        schedListContainer.innerHTML = currentSchedulesList.map((s) => {
          let cadenceBadge = '';
          if (s.schedule_type === 'interval') cadenceBadge = `⏱️ Every ${s.interval_minutes || 60}m`;
          else if (s.schedule_type === 'daily') cadenceBadge = `🌅 Daily at ${s.time_of_day || '00:00'}`;
          else if (s.schedule_type === 'weekly') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = days[s.day_of_week] || 'Mon';
            cadenceBadge = `📅 Weekly (${dayName} ${s.time_of_day || '00:00'})`;
          } else if (s.schedule_type === 'cron') cadenceBadge = `⚙️ Cron: <code>${s.cron_expr}</code>`;

          const enabled = Boolean(s.enabled);
          const nextDate = s.next_run_at ? new Date(s.next_run_at).toLocaleString() : 'Pending';
          const lastDate = s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never';

          return `
            <div class="panel panel-pad" style="padding:10px 14px; background:var(--ink-900, #121214); border:1px solid ${enabled ? 'var(--line)' : 'rgba(255,255,255,0.05)'}; border-radius:8px; opacity:${enabled ? '1' : '0.65'}">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
                <div style="display:flex; align-items:center; gap:8px">
                  <span style="font-weight:600; font-size:13px; color:var(--text-1)">${escapeHtml(s.name)}</span>
                  <span class="badge" style="font-size:10px; padding:2px 6px; background:var(--ink-800); color:var(--text-2)">${cadenceBadge}</span>
                  ${enabled ? '<span class="badge badge-active" style="font-size:9.5px">Active</span>' : '<span class="badge" style="font-size:9.5px; background:rgba(239,68,68,0.15); color:#f87171">Disabled</span>'}
                </div>
                <div style="display:flex; align-items:center; gap:6px">
                  <button class="btn btn-outline btn-sched-run-now" data-id="${s.id}" style="padding:2px 8px; font-size:10.5px" title="Trigger research run right now">Run Now</button>
                  <button class="btn btn-outline btn-sched-edit" data-id="${s.id}" style="padding:2px 8px; font-size:10.5px">Edit</button>
                  <button class="btn btn-outline btn-sched-toggle" data-id="${s.id}" data-enabled="${enabled ? '1' : '0'}" style="padding:2px 8px; font-size:10.5px">
                    ${enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button class="btn btn-ghost btn-sched-delete" data-id="${s.id}" style="padding:2px 6px; font-size:11px; color:#f87171" title="Delete Schedule">🗑️</button>
                </div>
              </div>

              <div style="display:flex; gap:16px; font-size:11px; color:var(--text-3)">
                <span>Next Run: <strong style="color:var(--text-2)">${nextDate}</strong></span>
                <span>Last Fired: <strong style="color:var(--text-2)">${lastDate}</strong></span>
                <span>Total Firings: <strong style="color:var(--text-2)">${s.firings_count || 0}</strong></span>
              </div>
            </div>
          `;
        }).join('');

        // Wire Action Buttons
        schedListContainer.querySelectorAll('.btn-sched-run-now').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const sid = btn.dataset.id;
            btn.disabled = true;
            btn.textContent = 'Launching…';
            try {
              const res = await window.schedulerAPI.runNow(sid);
              NRDToast.show({ type: 'success', title: 'Schedule Fired', msg: `Launched Run #${res.runId} immediately.` });
              loadSchedules();
            } catch (err) {
              NRDToast.show({ type: 'error', title: 'Launch Failed', msg: err.message });
            } finally {
              btn.disabled = false;
              btn.textContent = 'Run Now';
            }
          });
        });

        schedListContainer.querySelectorAll('.btn-sched-edit').forEach((btn) => {
          btn.addEventListener('click', () => {
            const sid = Number(btn.dataset.id);
            const item = currentSchedulesList.find((x) => x.id === sid);
            if (item) openScheduleForm(item);
          });
        });

        schedListContainer.querySelectorAll('.btn-sched-toggle').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const sid = Number(btn.dataset.id);
            const isCurrentlyEnabled = btn.dataset.enabled === '1';
            try {
              await window.schedulerAPI.updateSchedule(sid, { enabled: !isCurrentlyEnabled });
              NRDToast.show({ type: 'info', title: 'Schedule Updated', msg: `Schedule #${sid} ${!isCurrentlyEnabled ? 'enabled' : 'disabled'}.` });
              loadSchedules();
            } catch (err) {
              NRDToast.show({ type: 'error', title: 'Update Error', msg: err.message });
            }
          });
        });

        schedListContainer.querySelectorAll('.btn-sched-delete').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const sid = Number(btn.dataset.id);
            if (confirm(`Are you sure you want to delete Schedule #${sid}?`)) {
              try {
                await window.schedulerAPI.deleteSchedule(sid);
                NRDToast.show({ type: 'info', title: 'Schedule Deleted', msg: `Deleted schedule #${sid}.` });
                loadSchedules();
              } catch (err) {
                NRDToast.show({ type: 'error', title: 'Delete Error', msg: err.message });
              }
            }
          });
        });
      };

      const loadSchedules = async () => {
        if (!window.schedulerAPI || !window.schedulerAPI.getSchedules) return;
        try {
          currentSchedulesList = await window.schedulerAPI.getSchedules();
          renderSchedulesList();

          // Render firings summary
          if (schedFiringsList) {
            const allFirings = [];
            for (const s of currentSchedulesList.slice(0, 5)) {
              if (s.last_firing) {
                allFirings.push({
                  schedule_name: s.name,
                  ...s.last_firing,
                });
              }
            }
            if (allFirings.length > 0) {
              schedFiringsList.innerHTML = allFirings.map((f) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 8px; background:var(--ink-950, #09090b); border:1px solid var(--border); border-radius:4px">
                  <div style="display:flex; gap:8px; align-items:center">
                    <span style="font-weight:550; color:var(--text-1)">${escapeHtml(f.schedule_name)}</span>
                    <span class="badge" style="font-size:9px; background:${f.status === 'launched' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}; color:${f.status === 'launched' ? '#4ade80' : '#f87171'}">
                      ${f.status}
                    </span>
                    ${f.run_id ? `<span style="color:var(--text-3); font-size:10px">Run #${f.run_id}</span>` : ''}
                  </div>
                  <span style="color:var(--text-dim); font-size:10px">${new Date(f.fired_at).toLocaleTimeString()}</span>
                </div>
              `).join('');
            }
          }
        } catch (err) {
          console.warn('[settings] loadSchedules error:', err.message);
        }
      };

      if (btnRefreshSchedules) {
        btnRefreshSchedules.addEventListener('click', loadSchedules);
      }

      if (btnSaveSchedule) {
        btnSaveSchedule.addEventListener('click', async () => {
          const sid = schedIdInput ? schedIdInput.value : '';
          const name = schedNameInput ? schedNameInput.value.trim() : '';
          if (!name) {
            NRDToast.show({ type: 'warning', title: 'Validation', msg: 'Please enter a schedule name.' });
            return;
          }

          if (schedSelectedBizModes.size === 0) {
            NRDToast.show({ type: 'warning', title: 'Validation', msg: 'Please select at least one monetization business model.' });
            if (schedBizErrorMsg) schedBizErrorMsg.style.display = 'block';
            return;
          }

          const mode = schedInputModeSelect ? schedInputModeSelect.value : 'discovery';
          const ownNiche = schedOwnNicheName ? schedOwnNicheName.value.trim() : '';
          const ownDomain = schedDomainInput ? schedDomainInput.value.trim() : '';

          if (mode === 'own_niche' && !ownNiche) {
            NRDToast.show({ type: 'warning', title: 'Validation', msg: 'Please enter a target niche name.' });
            return;
          }
          if (mode === 'own_domain' && !ownDomain) {
            NRDToast.show({ type: 'warning', title: 'Validation', msg: 'Please enter a target domain name.' });
            return;
          }

          const type = schedTypeSelect ? schedTypeSelect.value : 'interval';
          const intervalMins = schedIntervalInput ? parseInt(schedIntervalInput.value, 10) : 60;
          const timeDaily = schedTimeDailyInput ? schedTimeDailyInput.value : '09:00';
          const dow = schedDowSelect ? parseInt(schedDowSelect.value, 10) : 1;
          const timeWeekly = schedTimeWeeklyInput ? schedTimeWeeklyInput.value : '09:00';
          const cronExpr = schedCronInput ? schedCronInput.value.trim() : '0 9 * * 1-5';

          // Get selected country codes from countrySelectorInstance if active
          let countries = schedSelectedCountries;
          if (schedCountrySelectorInstance && typeof schedCountrySelectorInstance.getSelected === 'function') {
            const sel = schedCountrySelectorInstance.getSelected();
            if (Array.isArray(sel) && sel.length > 0) countries = sel;
          }

          const runPayload = {
            run_name: `${name} (Auto)`,
            input_mode: mode,
            business_modes: Array.from(schedSelectedBizModes),
            niche_quantity: schedNicheQtyInput ? parseInt(schedNicheQtyInput.value, 10) : 1,
            country_codes: countries,
            niche_name: mode === 'own_niche' ? ownNiche : undefined,
            domain: mode === 'own_domain' ? ownDomain : undefined,
            auto_approve: schedAutoApproveInput ? schedAutoApproveInput.checked : true,
          };

          const payload = {
            name,
            schedule_type: type,
            interval_minutes: type === 'interval' ? intervalMins : null,
            time_of_day: type === 'daily' ? timeDaily : (type === 'weekly' ? timeWeekly : null),
            day_of_week: type === 'weekly' ? dow : null,
            cron_expr: type === 'cron' ? cronExpr : null,
            run_config: runPayload,
          };

          btnSaveSchedule.disabled = true;
          try {
            if (sid) {
              await window.schedulerAPI.updateSchedule(Number(sid), payload);
              NRDToast.show({ type: 'success', title: 'Schedule Updated', msg: `Saved changes to "${name}".` });
            } else {
              await window.schedulerAPI.createSchedule(payload);
              NRDToast.show({ type: 'success', title: 'Schedule Created', msg: `Created schedule "${name}".` });
            }
            closeScheduleForm();
            loadSchedules();
          } catch (err) {
            NRDToast.show({ type: 'error', title: 'Save Failed', msg: err.message });
          } finally {
            btnSaveSchedule.disabled = false;
          }
        });
      }

      loadSchedules();

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
