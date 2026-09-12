'use strict';

/**
 * NRD · pages/research.js — New Research Commission (Noir Atelier).
 * Supports 3 input modes: Discovery, Own Niche, Own Domain.
 * Connected to SQLite DB via window.dbAPI.createRun() and window.dbAPI.getRuns().
 * Employs reusable NRDCountrySelector component and responds live to Settings.
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  const BIZ_MODES = [
    {
      id: 'blogging',
      title: 'Blogging / AdSense',
      desc: 'High RPM informational search intent & display ad revenue',
      icon: '✍️',
    },
    {
      id: 'affiliate',
      title: 'Affiliate Marketing',
      desc: 'High ticket buyer intent with commercial commission programs',
      icon: '🔗',
    },
    {
      id: 'ecommerce',
      title: 'E-commerce / Physical',
      desc: 'Physical products, Amazon FBA, Shopify & TikTok Shop arbitrage',
      icon: '🛒',
    },
    {
      id: 'digital_products',
      title: 'Digital Products',
      desc: 'High-margin downloadable assets, SaaS, courses & digital templates',
      icon: '📱',
    },
  ];

  function cleanDomainInput(raw) {
    if (!raw) return '';
    let d = raw.trim().toLowerCase();
    d = d.replace(/^https?:\/\//i, '');
    d = d.replace(/^www\./i, '');
    d = d.split('/')[0].split('?')[0].split('#')[0];
    return d;
  }

  function isValidDomain(domain) {
    if (!domain) return false;
    const clean = cleanDomainInput(domain);
    // Basic domain validation: name.tld
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(clean);
  }

  function formatTime(isoStr) {
    if (!isoStr) return 'Just now';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  }

  window.NRDPages.research = {
    title: 'New Research',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-research';

      el.innerHTML = `
        <div class="page-head">
          <div>
            <h2>Commission the Department</h2>
            <div class="ph-sub">Configure a research run — the 35-agent swarm executes it in Phase 1 (P1.2).</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px">
            <button class="btn btn-outline" id="btn-scroll-history" type="button">
              ${NRDIcons.get('doc')} Commission Ledger
            </button>
          </div>
        </div>

        <div class="nr-grid">
          <!-- Left Column: Form Configuration -->
          <div style="display:flex; flex-direction:column; gap:16px">

            <!-- 1. Input Mode Selector (3 Premium Mode Cards) -->
            <div class="panel panel-pad">
              <div class="section-label">1. Select Input Mode</div>
              <div class="mode-tab-grid" id="mode-tabs">
                <div class="mode-tab-card active" data-mode="discovery" tabindex="0" role="button">
                  <div class="mtc-header">
                    <span class="mtc-icon">🔍</span>
                    <span class="mtc-pill">Autonomous</span>
                  </div>
                  <div class="mtc-title">Discovery Mode</div>
                  <div class="mtc-desc">Autonomous swarm scans SERPs, trends, and forums to surface fresh niche candidates.</div>
                </div>

                <div class="mode-tab-card" data-mode="own_niche" tabindex="0" role="button">
                  <div class="mtc-header">
                    <span class="mtc-icon">📌</span>
                    <span class="mtc-pill">Validation</span>
                  </div>
                  <div class="mtc-title">Own Niche</div>
                  <div class="mtc-desc">Bring a specific niche topic — the 35 agents analyze, validate, and build the monetization roadmap.</div>
                </div>

                <div class="mode-tab-card" data-mode="own_domain" tabindex="0" role="button">
                  <div class="mtc-header">
                    <span class="mtc-icon">🌐</span>
                    <span class="mtc-pill">Domain Fit</span>
                  </div>
                  <div class="mtc-title">Own Domain</div>
                  <div class="mtc-desc">Analyze your existing website to discover intelligently aligned adjacent growth niches.</div>
                </div>
              </div>
            </div>

            <!-- 2. Mode Specific Criteria Inputs -->
            <div class="panel panel-pad" id="mode-specific-panel">
              <!-- Dynamic mode specific inputs will render here -->
              <div id="mode-specific-container"></div>
            </div>

            <!-- 3. Business Modes (Multi-select 4 Cards) -->
            <div class="panel panel-pad">
              <div class="section-label">
                <span>3. Monetization & Business Models</span>
                <span style="font-size:10px; color:var(--cu-soft); text-transform:none; letter-spacing:normal">At least 1 required</span>
              </div>
              <div class="biz-cards" id="biz-cards-grid" style="grid-template-columns:repeat(2, 1fr); gap:10px">
                ${BIZ_MODES.map((m) => `
                  <button class="biz-card selected" data-biz="${m.id}" type="button" style="text-align:left">
                    <div style="display:flex; align-items:flex-start; gap:10px">
                      <span style="font-size:20px; line-height:1; margin-top:2px">${m.icon}</span>
                      <div style="flex:1">
                        <h5 style="margin:0 0 3px; font-size:13px">${m.title}</h5>
                        <p style="margin:0; font-size:11px; color:var(--text-3); line-height:1.4">${m.desc}</p>
                      </div>
                    </div>
                    <span class="bc-check">${NRDIcons.get('check')}</span>
                  </button>
                `).join('')}
              </div>
              <div class="field-error-msg" id="biz-error-msg" style="display:none">
                Please select at least one business monetization model.
              </div>
            </div>

            <!-- 4. Country Selection System (Reusable Component Mount) -->
            <div class="panel panel-pad">
              <div class="section-label">
                <span>4. Target Country Intelligence</span>
                <span style="font-size:10px; color:var(--text-3); text-transform:none; letter-spacing:normal">Optional · AI auto-selects if empty</span>
              </div>
              <div id="country-selector-mount"></div>
            </div>

          </div>

          <!-- Right Column: Sticky Summary & Commission Action -->
          <div class="nr-start">
            <div class="panel panel-pad panel-hero" style="position:sticky; top:16px">
              <div class="section-label">Commission Summary</div>

              <div class="est">
                <span>Input Mode</span>
                <b id="sum-mode" class="text-cu">Discovery</b>
              </div>

              <div class="est" id="sum-niche-row" style="display:none">
                <span>Target Niche</span>
                <b id="sum-niche" class="text-truncate" style="max-width:140px">—</b>
              </div>

              <div class="est" id="sum-domain-row" style="display:none">
                <span>Target Domain</span>
                <b id="sum-domain" class="text-truncate" style="max-width:140px">—</b>
              </div>

              <div class="est">
                <span>Business Models</span>
                <b id="sum-biz">All 4 Selected</b>
              </div>

              <div class="est">
                <span>Target Countries</span>
                <b id="sum-countries">Auto-Select (All)</b>
              </div>

              <div class="est">
                <span>Niches to Find</span>
                <b id="sum-quantity">5 niches</b>
              </div>

              <div class="est">
                <span>Agents Engaged</span>
                <b id="sum-agents" class="text-em">35 of 35 Agents</b>
              </div>

              <div class="est">
                <span>Est. Duration</span>
                <b id="sum-duration">≈ 12–18 minutes</b>
              </div>

              <!-- Live Approval Gate Status Line -->
              <div class="callout-banner" style="margin-top:16px; padding:10px 12px; font-size:11.5px" id="approval-gate-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10z"/></svg>
                <div id="approval-gate-text">
                  Loading approval gate policy…
                </div>
              </div>

              <!-- Start Research Button -->
              <button class="btn btn-cu btn-lg btn-block" id="btn-start-commission" style="margin-top:18px">
                <span class="btn-text">Start Research</span>
              </button>

              <div id="form-validation-summary" class="field-error-msg" style="display:none; justify-content:center; text-align:center; margin-top:8px"></div>

              <p class="text-faint" style="font-size:11px; text-align:center; margin-top:12px; line-height:1.55">
                The 35-agent swarm orchestrates in Phase 1.<br/>
                Saved directly to SQLite <code>research_runs</code> table.
              </p>
            </div>
          </div>
        </div>

        <!-- Commission Ledger Section: Historical Runs List -->
        <div class="panel panel-pad" id="ledger-section" style="margin-top:28px">
          <div class="section-label" style="display:flex; align-items:center; justify-content:space-between">
            <span>Commission Ledger (Database Runs)</span>
            <button class="btn btn-outline" style="height:26px; padding:0 10px; font-size:11px" id="btn-refresh-runs">
              ${NRDIcons.get('refresh')} Refresh
            </button>
          </div>

          <div class="runs-table-wrap">
            <table class="runs-table" id="runs-table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Mode</th>
                  <th>Business Models</th>
                  <th>Quantity</th>
                  <th>Target Countries</th>
                  <th>Status</th>
                  <th>Commissioned</th>
                  <th style="text-align:right">Action</th>
                </tr>
              </thead>
              <tbody id="runs-tbody">
                <tr>
                  <td colspan="8" style="text-align:center; color:var(--text-3); padding:24px">
                    Loading research runs from SQLite…
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Container for Success & Detail Views -->
        <div id="research-modal-root"></div>
      `;

      return el;
    },

    mounted() {
      const self = this;

      // Component State
      const state = {
        mode: 'discovery', // 'discovery' | 'own_niche' | 'own_domain'
        nicheName: '',
        domain: '',
        competition: 'medium', // 'low' | 'medium' | 'any'
        quantity: 5,
        bizModes: new Set(['blogging', 'affiliate', 'ecommerce', 'digital_products']),
        countries: [],
        isAutoCountries: true,
        autoApprove: false,
        isSubmitting: false,
      };

      // References
      let countrySelectorInstance = null;
      const modeSpecificContainer = document.getElementById('mode-specific-container');
      const btnStart = document.getElementById('btn-start-commission');
      const valSummary = document.getElementById('form-validation-summary');
      const approvalBannerText = document.getElementById('approval-gate-text');
      const modalRoot = document.getElementById('research-modal-root');

      // 1. Initialize Approval Gate setting
      const syncApprovalGate = (autoApproveVal) => {
        state.autoApprove = !!autoApproveVal;
        if (approvalBannerText) {
          if (state.autoApprove) {
            approvalBannerText.innerHTML = '<strong>Auto-approve: ON</strong> — full run executes in one click.';
          } else {
            approvalBannerText.innerHTML = '<strong>Approval Gate: ON</strong> — you will review the niche list before deep research.';
          }
        }
      };

      // Read initial setting from window.NRDSettings or DB
      if (window.NRDSettings && typeof window.NRDSettings.autoApprove !== 'undefined') {
        syncApprovalGate(window.NRDSettings.autoApprove);
      } else if (window.dbAPI && typeof window.dbAPI.getSettings === 'function') {
        window.dbAPI.getSettings().then((s) => {
          syncApprovalGate(s && s.autoApprove);
        }).catch(() => syncApprovalGate(false));
      } else {
        syncApprovalGate(false);
      }

      // Listen for live setting changes from Settings page
      const onSettingsChanged = (e) => {
        if (e.detail && typeof e.detail.autoApprove !== 'undefined') {
          syncApprovalGate(e.detail.autoApprove);
        }
      };
      window.addEventListener('nrd:settings-changed', onSettingsChanged);
      self._onSettingsChanged = onSettingsChanged;

      // 2. Mount Reusable Country Selector
      if (window.NRDCountrySelector) {
        countrySelectorInstance = window.NRDCountrySelector.create({
          container: '#country-selector-mount',
          initialSelected: [], // 0 countries selected initially = auto-select mode
          onChange: (selectedCodes, isAuto) => {
            state.countries = selectedCodes;
            state.isAutoCountries = isAuto;
            updateSummary();
            validate();
          },
        });
        self._csInstance = countrySelectorInstance;
      }

      // 3. Render Mode Specific Form Fields
      const renderModeFields = () => {
        if (!modeSpecificContainer) return;

        if (state.mode === 'discovery') {
          modeSpecificContainer.innerHTML = `
            <div class="section-label">2. Discovery Specifications</div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:12px">
              <div class="field">
                <label for="input-competition">Competition Level</label>
                <div class="segmented-control" id="sc-competition">
                  <div class="sc-btn ${state.competition === 'low' ? 'active' : ''}" data-val="low">Low</div>
                  <div class="sc-btn ${state.competition === 'medium' ? 'active' : ''}" data-val="medium">Medium</div>
                  <div class="sc-btn ${state.competition === 'any' ? 'active' : ''}" data-val="any">Any</div>
                </div>
                <div class="hint" style="font-size:11px; color:var(--text-3); margin-top:4px">
                  Determines SERP difficulty ceilings analyzed by Agent #12.
                </div>
              </div>

              <div class="field">
                <label for="input-qty">Niche Quantity <span class="text-cu">*</span></label>
                <input class="input" id="input-qty" type="number" min="1" max="50" value="${state.quantity}" />
                <div class="hint" style="font-size:11px; color:var(--text-3); margin-top:4px">
                  Agents will find EXACTLY this many niches — no more, no less.
                </div>
                <div class="field-error-msg" id="qty-error" style="display:none">
                  Quantity must be at least 1.
                </div>
              </div>
            </div>
          `;

          // Bind segmented control
          const scBtns = modeSpecificContainer.querySelectorAll('#sc-competition .sc-btn');
          scBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
              scBtns.forEach((b) => b.classList.remove('active'));
              btn.classList.add('active');
              state.competition = btn.dataset.val;
              updateSummary();
            });
          });

          // Bind quantity input
          const qtyInput = modeSpecificContainer.querySelector('#input-qty');
          if (qtyInput) {
            qtyInput.addEventListener('input', (e) => {
              const val = parseInt(e.target.value, 10);
              state.quantity = isNaN(val) ? 0 : val;
              updateSummary();
              validate();
            });
          }
        } else if (state.mode === 'own_niche') {
          modeSpecificContainer.innerHTML = `
            <div class="section-label">2. Own Niche Target</div>

            <div class="field" style="margin-bottom:12px">
              <label for="input-niche-name">Niche Idea or Category Name <span class="text-cu">*</span></label>
              <input class="input" id="input-niche-name" type="text" placeholder="e.g. Ergonomic Office Chairs, Pet Grooming, Urban Hydroponics…" value="${state.nicheName}" />
              <div class="hint" style="font-size:11px; color:var(--text-3); margin-top:4px">
                Provide your candidate niche — the 35 agents will perform a full-depth validation run.
              </div>
              <div class="field-error-msg" id="niche-error" style="display:none">
                Please enter a niche idea to research.
              </div>
            </div>
          `;

          state.quantity = 1; // Own niche is 1 specific target

          const nicheInput = modeSpecificContainer.querySelector('#input-niche-name');
          if (nicheInput) {
            nicheInput.addEventListener('input', (e) => {
              state.nicheName = e.target.value;
              updateSummary();
              validate();
            });
          }
        } else if (state.mode === 'own_domain') {
          modeSpecificContainer.innerHTML = `
            <div class="section-label">2. Domain Adjacent Intelligence</div>

            <div class="callout-banner" style="margin-bottom:14px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></svg>
              <div>
                Only niches that intelligently fit this domain will be researched. Every report will explain WHY and HOW each niche fits your domain.
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:16px; margin-bottom:12px">
              <div class="field">
                <label for="input-domain">Target Domain Name <span class="text-cu">*</span></label>
                <input class="input" id="input-domain" type="text" placeholder="e.g. bestkitchengear.com, techgadgets.io…" value="${state.domain}" />
                <div class="hint" style="font-size:11px; color:var(--text-3); margin-top:4px">
                  Enter your domain or brand website.
                </div>
                <div class="field-error-msg" id="domain-error" style="display:none">
                  Please enter a valid domain (e.g. mybrand.com).
                </div>
              </div>

              <div class="field">
                <label for="input-qty">Niches to Discover <span class="text-cu">*</span></label>
                <input class="input" id="input-qty" type="number" min="1" max="50" value="${state.quantity || 5}" />
                <div class="hint" style="font-size:11px; color:var(--text-3); margin-top:4px">
                  Number of adjacent niches to locate.
                </div>
                <div class="field-error-msg" id="qty-error" style="display:none">
                  Quantity must be at least 1.
                </div>
              </div>
            </div>
          `;

          const domainInput = modeSpecificContainer.querySelector('#input-domain');
          if (domainInput) {
            domainInput.addEventListener('input', (e) => {
              state.domain = e.target.value;
              updateSummary();
              validate();
            });
          }

          const qtyInput = modeSpecificContainer.querySelector('#input-qty');
          if (qtyInput) {
            qtyInput.addEventListener('input', (e) => {
              const val = parseInt(e.target.value, 10);
              state.quantity = isNaN(val) ? 0 : val;
              updateSummary();
              validate();
            });
          }
        }
      };

      // 4. Update Summary Sidebar
      const updateSummary = () => {
        const sumMode = document.getElementById('sum-mode');
        const sumNicheRow = document.getElementById('sum-niche-row');
        const sumNiche = document.getElementById('sum-niche');
        const sumDomainRow = document.getElementById('sum-domain-row');
        const sumDomain = document.getElementById('sum-domain');
        const sumBiz = document.getElementById('sum-biz');
        const sumCountries = document.getElementById('sum-countries');
        const sumQuantity = document.getElementById('sum-quantity');
        const sumAgents = document.getElementById('sum-agents');
        const sumDuration = document.getElementById('sum-duration');

        if (sumMode) {
          if (state.mode === 'discovery') sumMode.textContent = 'Discovery';
          else if (state.mode === 'own_niche') sumMode.textContent = 'Own Niche';
          else if (state.mode === 'own_domain') sumMode.textContent = 'Own Domain';
        }

        if (sumNicheRow && sumNiche) {
          if (state.mode === 'own_niche') {
            sumNicheRow.style.display = 'flex';
            sumNiche.textContent = state.nicheName.trim() || '—';
          } else {
            sumNicheRow.style.display = 'none';
          }
        }

        if (sumDomainRow && sumDomain) {
          if (state.mode === 'own_domain') {
            sumDomainRow.style.display = 'flex';
            sumDomain.textContent = cleanDomainInput(state.domain) || '—';
          } else {
            sumDomainRow.style.display = 'none';
          }
        }

        if (sumBiz) {
          if (state.bizModes.size === 0) {
            sumBiz.textContent = 'None selected';
            sumBiz.className = 'text-bad';
          } else if (state.bizModes.size === 4) {
            sumBiz.textContent = 'All 4 Models';
            sumBiz.className = 'text-cu';
          } else {
            sumBiz.textContent = `${state.bizModes.size} Selected`;
            sumBiz.className = '';
          }
        }

        if (sumCountries) {
          if (state.countries.length === 0) {
            sumCountries.textContent = 'Auto-Select (All)';
            sumCountries.className = 'text-em';
          } else {
            const flags = state.countries.map((c) => window.NRDCountrySelector?.getFlagEmoji(c) || c).join(' ');
            sumCountries.textContent = `${state.countries.length} (${flags})`;
            sumCountries.className = '';
          }
        }

        if (sumQuantity) {
          sumQuantity.textContent = `${state.quantity} ${state.quantity === 1 ? 'niche' : 'niches'}`;
        }

        if (sumAgents && sumDuration) {
          const qty = state.quantity || 1;
          const bizCount = state.bizModes.size || 1;
          const activeAgents = Math.min(35, Math.max(12, 10 + qty * 2 + bizCount * 3));
          sumAgents.textContent = `${activeAgents} of 35 Agents`;
          sumDuration.textContent = `≈ ${Math.max(6, qty * 2 + 4)}–${Math.max(12, qty * 4 + 8)} min`;
        }
      };

      // 5. Validation Function
      const validate = () => {
        const errors = [];
        let isModeValid = true;

        // Reset inline error elements
        const nicheErr = document.getElementById('niche-error');
        const domainErr = document.getElementById('domain-error');
        const qtyErr = document.getElementById('qty-error');
        const bizErr = document.getElementById('biz-error-msg');

        if (nicheErr) nicheErr.style.display = 'none';
        if (domainErr) domainErr.style.display = 'none';
        if (qtyErr) qtyErr.style.display = 'none';
        if (bizErr) bizErr.style.display = 'none';

        // Check Business Modes (at least 1 required)
        if (state.bizModes.size === 0) {
          errors.push('Select at least one monetization business model.');
          if (bizErr) bizErr.style.display = 'flex';
        }

        // Mode specific validation
        if (state.mode === 'discovery') {
          if (!state.quantity || state.quantity < 1) {
            errors.push('Niche quantity must be 1 or greater.');
            if (qtyErr) qtyErr.style.display = 'flex';
            isModeValid = false;
          }
        } else if (state.mode === 'own_niche') {
          if (!state.nicheName.trim() || state.nicheName.trim().length < 2) {
            errors.push('Enter a candidate niche name to research.');
            if (nicheErr) nicheErr.style.display = 'flex';
            isModeValid = false;
          }
        } else if (state.mode === 'own_domain') {
          if (!isValidDomain(state.domain)) {
            errors.push('Enter a valid domain name (e.g. mysite.com).');
            if (domainErr) domainErr.style.display = 'flex';
            isModeValid = false;
          }
          if (!state.quantity || state.quantity < 1) {
            errors.push('Niche quantity must be 1 or greater.');
            if (qtyErr) qtyErr.style.display = 'flex';
            isModeValid = false;
          }
        }

        const isValid = errors.length === 0;

        if (btnStart) {
          btnStart.disabled = !isValid || state.isSubmitting;
        }

        if (valSummary) {
          if (errors.length > 0 && (state.nicheName || state.domain || state.bizModes.size === 0)) {
            valSummary.textContent = errors[0];
            valSummary.style.display = 'flex';
          } else {
            valSummary.style.display = 'none';
          }
        }

        return isValid;
      };

      // 6. Mode Switch Events
      const modeCards = document.querySelectorAll('.mode-tab-card');
      modeCards.forEach((card) => {
        const selectMode = () => {
          modeCards.forEach((c) => c.classList.remove('active'));
          card.classList.add('active');
          state.mode = card.dataset.mode;
          renderModeFields();
          updateSummary();
          validate();
        };

        card.addEventListener('click', selectMode);
        card.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            selectMode();
          }
        });
      });

      // 7. Business Modes Selection Events
      const bizCards = document.querySelectorAll('.biz-card');
      bizCards.forEach((card) => {
        card.addEventListener('click', () => {
          const id = card.dataset.biz;
          if (state.bizModes.has(id)) {
            state.bizModes.delete(id);
            card.classList.remove('selected');
          } else {
            state.bizModes.add(id);
            card.classList.add('selected');
          }
          updateSummary();
          validate();
        });
      });

      // 8. Start Research Commission Handler
      if (btnStart) {
        btnStart.addEventListener('click', async (e) => {
          e.preventDefault();
          if (!validate() || state.isSubmitting) return;

          state.isSubmitting = true;
          btnStart.disabled = true;
          const btnTextEl = btnStart.querySelector('.btn-text');
          if (btnTextEl) btnTextEl.textContent = 'Commissioning Research Run…';

          try {
            // Build run payload
            let runName = '';
            if (state.mode === 'discovery') {
              runName = `Discovery Run (${state.quantity} niches)`;
            } else if (state.mode === 'own_niche') {
              runName = `Validation: ${state.nicheName.trim()}`;
            } else if (state.mode === 'own_domain') {
              runName = `Domain: ${cleanDomainInput(state.domain)}`;
            }

            const cleanDomain = state.mode === 'own_domain' ? cleanDomainInput(state.domain) : null;
            const countryCodes = state.countries.length > 0 ? [...state.countries] : [];

            const runData = {
              run_name: runName,
              input_mode: state.mode,
              business_modes: Array.from(state.bizModes),
              niche_quantity: state.mode === 'own_niche' ? 1 : state.quantity,
              domain: cleanDomain,
              competition_level: state.competition || 'medium',
              status: 'pending',
              approval_gate_passed: 0,
              auto_approve: state.autoApprove ? 1 : 0,
              trigger_source: 'ui',
            };

            const criteriaBrief = {
              input_mode: state.mode,
              niche_name: state.mode === 'own_niche' ? state.nicheName.trim() : null,
              domain: cleanDomain,
              niche_quantity: state.mode === 'own_niche' ? 1 : state.quantity,
              competition_level: state.competition,
              business_modes: Array.from(state.bizModes),
              country_codes: countryCodes,
              auto_countries: countryCodes.length === 0,
              created_at: new Date().toISOString(),
            };

            let createdRun = null;
            if (window.dbAPI && typeof window.dbAPI.createRun === 'function') {
              createdRun = await window.dbAPI.createRun(runData, countryCodes, criteriaBrief);
            } else {
              // Fallback via dev-stub
              const res = await fetch('/api/db/runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ runData, countryCodes, criteriaBrief }),
              });
              createdRun = await res.json();
            }

            if (!createdRun || !createdRun.id) {
              throw new Error('Database did not return a valid run ID.');
            }

            // Show Toast
            if (window.NRDToast) {
              window.NRDToast.show({
                type: 'success',
                title: `Run #${createdRun.id} Commissioned & Parsed`,
                msg: `Mission Brief generated. 35-agent swarm assigned (${countryCodes.length === 0 ? 'auto-potential' : `${countryCodes.length} countries`}).`,
              });
            }

            // Show Success Modal
            self.showSuccessModal(createdRun, countryCodes, () => {
              // Reset form
              state.nicheName = '';
              state.domain = '';
              renderModeFields();
              updateSummary();
              validate();
            });

            // Refresh Runs Ledger
            loadRunsLedger();
          } catch (err) {
            console.error('[NewResearch] Commission failed:', err);
            if (window.NRDToast) {
              window.NRDToast.show({
                type: 'error',
                title: 'Commission failed',
                msg: err.message || 'Could not save run to database.',
              });
            }
          } finally {
            state.isSubmitting = false;
            btnStart.disabled = false;
            if (btnTextEl) btnTextEl.textContent = 'Start Research';
            validate();
          }
        });
      }

      // 9. Load Historical Runs Ledger
      const loadRunsLedger = async () => {
        const tbody = document.getElementById('runs-tbody');
        if (!tbody) return;

        try {
          let runs = [];
          if (window.dbAPI && typeof window.dbAPI.getRuns === 'function') {
            runs = await window.dbAPI.getRuns({ limit: 30 });
          } else {
            const res = await fetch('/api/db/runs?limit=30');
            runs = await res.json();
          }

          if (!Array.isArray(runs) || runs.length === 0) {
            tbody.innerHTML = `
              <tr>
                <td colspan="9" style="text-align:center; color:var(--text-3); padding:28px">
                  No research runs commissioned yet. Configure a run above and click <b>Start Research</b>.
                </td>
              </tr>
            `;
            return;
          }

          tbody.innerHTML = runs.map((r) => {
            const bModes = Array.isArray(r.business_modes) ? r.business_modes : [];
            const countries = Array.isArray(r.countries) ? r.countries : [];
            const countryChips = countries.length === 0
              ? `<span class="run-status-pill status-planning" title="Agent #10 Auto-select">Auto (Agent #10)</span>`
              : countries.map((c) => {
                  const flag = window.NRDCountrySelector?.getFlagEmoji(c.country_code) || '🌐';
                  return `<span title="${c.country_name || c.country_code}" style="font-size:14px; margin-right:2px">${flag}</span>`;
                }).join('') + ` <span style="font-size:10.5px; color:var(--text-3)">(${countries.length})</span>`;

            const modeBadge = r.input_mode === 'discovery'
              ? `<span class="badge badge-active">Discovery</span>`
              : r.input_mode === 'own_niche'
                ? `<span class="badge badge-high">Own Niche</span>`
                : `<span class="badge badge-med">Own Domain</span>`;

            const statusClass = `status-${r.status || 'pending'}`;

            // Brief chip logic (P1.1)
            let briefChip = `<span class="badge" style="background:rgba(255,255,255,0.06); color:var(--text-3)">Pending</span>`;
            if (r.status === 'failed') {
              briefChip = `<span class="badge" style="background:rgba(224,122,106,0.15); color:#E07A6A; border:1px solid rgba(224,122,106,0.3)">Brief ✕</span>`;
            } else if (r.has_brief || r.status === 'planning') {
              briefChip = `<span class="badge" style="background:rgba(200,140,80,0.15); color:var(--cu); border:1px solid rgba(200,140,80,0.3)">Brief v${r.criteria_version || '1.0'} ✓</span>`;
            }

            return `
              <tr data-run-id="${r.id}">
                <td><b class="text-cu">#${r.id}</b></td>
                <td>${modeBadge}</td>
                <td>
                  <div style="display:flex; gap:4px; flex-wrap:wrap">
                    ${bModes.map((m) => `<span class="badge" style="font-size:9.5px; padding:1px 5px">${m}</span>`).join('')}
                  </div>
                </td>
                <td><b>${r.niche_quantity || 1}</b></td>
                <td>${countryChips}</td>
                <td>${briefChip}</td>
                <td><span class="run-status-pill ${statusClass}"><span class="sc-dot"></span>${r.status || 'pending'}</span></td>
                <td style="font-size:11.5px; color:var(--text-3)">${formatTime(r.created_at)}</td>
                <td style="text-align:right">
                  <button class="btn btn-outline btn-view-run" data-run-id="${r.id}" style="height:26px; padding:0 10px; font-size:11px" type="button">
                    Inspect
                  </button>
                </td>
              </tr>
            `;
          }).join('');

          // Row click & inspect button delegation
          tbody.querySelectorAll('[data-run-id]').forEach((row) => {
            row.addEventListener('click', (e) => {
              const runId = row.dataset.runId;
              if (runId) self.showRunDetailModal(Number(runId));
            });
          });
        } catch (err) {
          console.error('[NewResearch] Failed to load runs ledger:', err);
          tbody.innerHTML = `
            <tr>
              <td colspan="9" style="text-align:center; color:#E07A6A; padding:20px">
                Failed to load runs from database: ${err.message}
              </td>
            </tr>
          `;
        }
      };

      // Refresh button
      const btnRefresh = document.getElementById('btn-refresh-runs');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => loadRunsLedger());
      }

      // Scroll to ledger button
      const btnScrollHistory = document.getElementById('btn-scroll-history');
      if (btnScrollHistory) {
        btnScrollHistory.addEventListener('click', () => {
          const ledgerEl = document.getElementById('ledger-section');
          if (ledgerEl) ledgerEl.scrollIntoView({ behavior: 'smooth' });
        });
      }

      // Initial Mount Executions
      renderModeFields();
      updateSummary();
      validate();
      loadRunsLedger();
    },

    /**
     * Shows modal confirming run creation with queued 35 agents notice
     */
    showSuccessModal(run, countryCodes, onReset) {
      const modalRoot = document.getElementById('research-modal-root');
      if (!modalRoot) return;

      const flagList = countryCodes.length === 0
        ? 'Auto-Potential Mode (Agent #10 will analyze all potential markets)'
        : countryCodes.map((c) => `${window.NRDCountrySelector?.getFlagEmoji(c) || '🌐'} ${c}`).join(', ');

      const modalEl = document.createElement('div');
      modalEl.className = 'modal-backdrop';
      modalEl.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <div>
              <div class="modal-success-badge">
                ${NRDIcons.get('check')} Run Created & Parsed
              </div>
              <div class="modal-title">Run #${run.id} Commissioned & Mission Brief Ready</div>
              <div class="modal-subtitle">
                Run #${run.id} created & parsed — Mission Brief ready. Department Head will take over in P1.2.
              </div>
            </div>
            <button class="modal-close-btn" id="m-btn-close">✕</button>
          </div>

          <div style="background:var(--ink-800); border:1px solid var(--line-2); border-radius:10px; padding:16px; margin-bottom:20px">
            <div class="kv-row" style="padding:6px 0">
              <span class="kv-k">Run Name</span>
              <span class="kv-v text-cu" style="font-weight:600">${run.run_name}</span>
            </div>
            <div class="kv-row" style="padding:6px 0">
              <span class="kv-k">Input Mode</span>
              <span class="kv-v" style="text-transform:capitalize">${run.input_mode}</span>
            </div>
            <div class="kv-row" style="padding:6px 0">
              <span class="kv-k">Niche Quantity</span>
              <span class="kv-v"><b>${run.niche_quantity}</b> ${run.niche_quantity === 1 ? 'niche' : 'niches'} requested</span>
            </div>
            <div class="kv-row" style="padding:6px 0">
              <span class="kv-k">Target Countries</span>
              <span class="kv-v">${flagList}</span>
            </div>
            <div class="kv-row" style="padding:6px 0">
              <span class="kv-k">Criteria Parser Agent (#2)</span>
              <span class="kv-v" style="color:var(--cu); font-weight:600">Mission Brief v1.0 Generated ✓</span>
            </div>
            <div class="kv-row" style="padding:6px 0">
              <span class="kv-k">Status</span>
              <span class="kv-v text-em">Planning (Ready for Department Head swarm in P1.2)</span>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px">
            <button class="btn btn-outline" id="m-btn-new-run">Commission Another Run</button>
            <button class="btn btn-cu" id="m-btn-view-details">Inspect Mission Brief</button>
          </div>
        </div>
      `;

      modalRoot.appendChild(modalEl);

      const closeModal = () => modalEl.remove();

      modalEl.querySelector('#m-btn-close').addEventListener('click', closeModal);
      modalEl.querySelector('#m-btn-new-run').addEventListener('click', () => {
        closeModal();
        if (onReset) onReset();
      });
      modalEl.querySelector('#m-btn-view-details').addEventListener('click', () => {
        closeModal();
        this.showRunDetailModal(run.id);
      });

      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) closeModal();
      });
    },

    /**
     * Shows detailed modal with SQLite run criteria, DH Execution Plan, Live Agent Feed & 35-agent status matrix
     */
    async showRunDetailModal(runId) {
      const modalRoot = document.getElementById('research-modal-root');
      if (!modalRoot) return;

      const modalEl = document.createElement('div');
      modalEl.className = 'modal-backdrop';
      modalEl.innerHTML = `
        <div class="modal-dialog" style="max-width:960px; max-height:90vh; display:flex; flex-direction:column">
          <div class="modal-header" style="flex-shrink:0">
            <div>
              <div class="modal-title" style="display:flex; align-items:center; gap:8px">
                <span>Run #${runId} Mission Control & Execution</span>
                <span id="md-header-status"></span>
              </div>
              <div class="modal-subtitle">Orchestrated by Department Head (Agent #1) • Autonomous 35-Agent Pipeline</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px">
              <div id="md-header-actions" style="display:flex; gap:6px"></div>
              <button class="modal-close-btn" id="md-btn-close">✕</button>
            </div>
          </div>
          <div id="md-content" style="padding:16px 0; overflow-y:auto; flex:1; text-align:center; color:var(--text-3)">
            Loading run telemetry from database…
          </div>
        </div>
      `;

      modalRoot.appendChild(modalEl);

      let unsubscribeRunStatus = null;
      let unsubscribeAgentStatus = null;

      const closeModal = () => {
        if (typeof unsubscribeRunStatus === 'function') unsubscribeRunStatus();
        if (typeof unsubscribeAgentStatus === 'function') unsubscribeAgentStatus();
        modalEl.remove();
      };

      modalEl.querySelector('#md-btn-close').addEventListener('click', closeModal);
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) closeModal();
      });

      const renderDetails = async () => {
        try {
          let runData = null;
          if (window.dbAPI && typeof window.dbAPI.getRun === 'function') {
            runData = await window.dbAPI.getRun(runId);
          } else {
            const res = await fetch(`/api/db/runs/${runId}`);
            runData = await res.json();
          }

          if (!runData) {
            throw new Error('Run record not found in database.');
          }

          const mdContent = modalEl.querySelector('#md-content');
          const headerStatus = modalEl.querySelector('#md-header-status');
          const headerActions = modalEl.querySelector('#md-header-actions');
          if (!mdContent) return;

          if (headerStatus) {
            headerStatus.innerHTML = `<span class="run-status-pill status-${runData.status}">${runData.status}</span>`;
          }

          // Top Header Action Controls based on state
          if (headerActions) {
            let actionButtonsHtml = '';
            if (['draft', 'ready', 'failed'].includes(runData.status)) {
              actionButtonsHtml += `
                <button class="btn btn-primary btn-mc-start" style="height:28px; padding:0 12px; font-size:11.5px; font-weight:600" type="button">
                  ▶ Start Research Chain
                </button>
              `;
            } else if (runData.status === 'running') {
              actionButtonsHtml += `
                <button class="btn btn-outline btn-mc-pause" style="height:28px; padding:0 10px; font-size:11.5px; color:#E5C07B; border-color:rgba(229,192,123,0.4)" type="button">
                  ⏸ Pause
                </button>
                <button class="btn btn-outline btn-mc-cancel" style="height:28px; padding:0 10px; font-size:11.5px; color:#E07A6A; border-color:rgba(224,122,106,0.4)" type="button">
                  ⏹ Cancel
                </button>
              `;
            } else if (runData.status === 'paused') {
              actionButtonsHtml += `
                <button class="btn btn-primary btn-mc-start" style="height:28px; padding:0 12px; font-size:11.5px; font-weight:600" type="button">
                  ▶ Resume Chain
                </button>
                <button class="btn btn-outline btn-mc-cancel" style="height:28px; padding:0 10px; font-size:11.5px; color:#E07A6A; border-color:rgba(224,122,106,0.4)" type="button">
                  ⏹ Cancel
                </button>
              `;
            } else if (runData.status === 'awaiting_approval') {
              actionButtonsHtml += `
                <button class="btn btn-primary btn-mc-approve" style="height:28px; padding:0 12px; font-size:11.5px; font-weight:600; background:#98C379; border-color:#98C379; color:#1e1e1e" type="button">
                  ✓ Approve & Continue
                </button>
                <button class="btn btn-outline btn-mc-cancel" style="height:28px; padding:0 10px; font-size:11.5px; color:#E07A6A; border-color:rgba(224,122,106,0.4)" type="button">
                  ⏹ Cancel
                </button>
              `;
            }
            headerActions.innerHTML = actionButtonsHtml;
          }

          const countries = runData.countries || [];
          const agents = runData.agents || [];
          const criteria = runData.criteria || {};
          const brief = criteria.parsed_brief || null;
          const plan = runData.dh_execution_plan || null;
          const chainState = runData.chain_state || null;

          // Group agents by layer
          const layers = {
            control: { name: 'Control Layer (Agents 1–5)', items: [] },
            discovery: { name: 'Discovery Layer (Agents 6–10)', items: [] },
            deep_research: { name: 'Deep Research Layer (Agents 11–26)', items: [] },
            intelligence: { name: 'Intelligence Layer (Agents 27–30)', items: [] },
            qa_reporting: { name: 'QA & Reporting Layer (Agents 31–35)', items: [] },
          };

          agents.forEach((ag) => {
            if (layers[ag.layer]) {
              layers[ag.layer].items.push(ag);
            }
          });

          mdContent.style.textAlign = 'left';
          mdContent.innerHTML = `
            <!-- High-Level Run Summary -->
            <div style="background:var(--ink-800); border:1px solid var(--line-2); border-radius:10px; padding:14px; margin-bottom:16px">
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px">
                <div class="kv-row" style="padding:2px 0">
                  <span class="kv-k">Run Name</span>
                  <span class="kv-v text-cu" style="font-weight:600">${runData.run_name}</span>
                </div>
                <div class="kv-row" style="padding:2px 0">
                  <span class="kv-k">Status</span>
                  <span class="kv-v"><span class="run-status-pill status-${runData.status}">${runData.status}</span></span>
                </div>
                <div class="kv-row" style="padding:2px 0">
                  <span class="kv-k">Input Mode</span>
                  <span class="kv-v">${runData.input_mode}</span>
                </div>
                <div class="kv-row" style="padding:2px 0">
                  <span class="kv-k">Target Niches</span>
                  <span class="kv-v">${runData.niche_quantity} niches</span>
                </div>
                ${runData.own_niche_name ? `
                  <div class="kv-row" style="padding:2px 0">
                    <span class="kv-k">Candidate Niche</span>
                    <span class="kv-v text-cu">${runData.own_niche_name}</span>
                  </div>
                ` : ''}
                ${runData.domain ? `
                  <div class="kv-row" style="padding:2px 0">
                    <span class="kv-k">Domain</span>
                    <span class="kv-v">${runData.domain}</span>
                  </div>
                ` : ''}
                <div class="kv-row" style="padding:2px 0">
                  <span class="kv-k">Auto-approve</span>
                  <span class="kv-v">${runData.auto_approve ? 'Enabled (1-click)' : 'Disabled (Approval Gate)'}</span>
                </div>
                <div class="kv-row" style="padding:2px 0">
                  <span class="kv-k">Execution Phase</span>
                  <span class="kv-v" style="font-weight:600; color:var(--cu)">${chainState?.phase ? chainState.phase.toUpperCase() : (plan ? 'PLAN BUILT' : 'IDLE')}</span>
                </div>
              </div>
            </div>

            <!-- Approval Gate Banner (when awaiting_approval) -->
            ${runData.status === 'awaiting_approval' ? `
              <div style="background:rgba(229,192,123,0.12); border:1px solid rgba(229,192,123,0.45); border-radius:10px; padding:16px; margin-bottom:16px">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px">
                  <div>
                    <div style="display:flex; align-items:center; gap:8px">
                      <span style="font-size:18px">🛡️</span>
                      <span style="font-weight:700; color:#E5C07B; font-size:14px">Phase 1 Complete: Candidate Niches Awaiting Approval</span>
                    </div>
                    <div style="font-size:12.5px; color:var(--text-1); margin-top:6px; line-height:1.5">
                      The Discovery Layer (Agents #6–10) has finished analyzing and identified viable candidate niches. Review and approve to launch Deep Research & Intelligence analysis.
                    </div>
                  </div>
                  <div style="display:flex; gap:8px; flex-shrink:0">
                    <button class="btn btn-primary btn-mc-approve" style="background:#98C379; border-color:#98C379; color:#1e1e1e; font-weight:700; height:32px; padding:0 14px" type="button">
                      ✓ Approve All & Continue
                    </button>
                    <button class="btn btn-outline btn-mc-cancel" style="color:#E07A6A; border-color:rgba(224,122,106,0.4); height:32px; padding:0 12px" type="button">
                      Cancel Run
                    </button>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Error Banner if failed -->
            ${(runData.status === 'failed' || runData.error_summary) ? `
              <div style="background:rgba(224,122,106,0.1); border:1px solid rgba(224,122,106,0.35); border-radius:8px; padding:12px 14px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; gap:12px">
                <div>
                  <div style="font-weight:600; color:#E07A6A; font-size:12.5px">Execution / Parser Alert</div>
                  <div style="font-size:12px; color:var(--text-2); margin-top:2px">${runData.error_summary || 'Chain halted due to error'}</div>
                </div>
                <div style="display:flex; gap:6px">
                  <button class="btn btn-outline btn-reparse-action" style="border-color:rgba(224,122,106,0.5); height:28px; font-size:11.5px" type="button">
                    Re-run Parser
                  </button>
                  <button class="btn btn-primary btn-mc-start" style="height:28px; font-size:11.5px" type="button">
                    Retry Run
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- DEPARTMENT HEAD (AGENT #1) EXECUTION PLAN -->
            <div style="background:var(--ink-800); border:1px solid var(--line-cu, rgba(200,140,80,0.3)); border-radius:10px; padding:14px; margin-bottom:16px">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                <div style="display:flex; align-items:center; gap:8px">
                  <span style="font-size:15px">👑</span>
                  <span style="font-size:13.5px; font-weight:600; color:var(--cu)">Agent #1 Department Head — Execution Plan</span>
                  <span class="badge badge-parsed" style="font-size:10px">${plan ? `${plan.plan_summary?.total_agents || 35} Agents Scheduled` : 'Pending'}</span>
                </div>
                <div style="display:flex; gap:6px">
                  ${plan ? `
                    <button class="btn btn-outline btn-copy-plan" style="height:24px; padding:0 8px; font-size:11px" type="button">
                      Copy Plan JSON
                    </button>
                  ` : ''}
                  <button class="btn btn-outline btn-rebuild-plan" style="height:24px; padding:0 8px; font-size:11px" type="button">
                    ${plan ? 'Rebuild Plan' : 'Generate Plan'}
                  </button>
                </div>
              </div>

              ${plan ? `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:8px; margin-bottom:12px">
                  <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px">
                    <div style="font-size:10.5px; color:var(--text-3)">Execution Phases</div>
                    <div style="font-size:12px; font-weight:600; color:var(--text-1); margin-top:2px">
                      ${(plan.phases || []).length} Phases Planned
                    </div>
                  </div>
                  <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px">
                    <div style="font-size:10.5px; color:var(--text-3)">Agent #10 (Potential)</div>
                    <div style="font-size:12px; font-weight:600; color:var(--text-1); margin-top:2px">
                      ${plan.plan_summary?.agent_10_status || 'Auto'}
                    </div>
                  </div>
                  <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px">
                    <div style="font-size:10.5px; color:var(--text-3)">Estimated Wall Clock</div>
                    <div style="font-size:12px; font-weight:600; color:var(--text-1); margin-top:2px">
                      ~${Math.round((plan.plan_summary?.estimated_total_seconds || 900) / 60)} minutes
                    </div>
                  </div>
                  <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px">
                    <div style="font-size:10.5px; color:var(--text-3)">Registered Agents</div>
                    <div style="font-size:12px; font-weight:600; color:#98C379; margin-top:2px">
                      ${plan.plan_summary?.registered_agents_count || 2} active / ${(plan.plan_summary?.pending_agents_count || 33)} pending
                    </div>
                  </div>
                </div>

                <!-- Phase-by-phase breakdown -->
                <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px">
                  ${(plan.phases || []).map((ph) => {
                    const isCurrent = chainState?.phase === ph.phase_id;
                    return `
                      <div style="background:var(--ink-900); border:1px solid ${isCurrent ? 'var(--cu)' : 'var(--line-2)'}; border-radius:6px; padding:10px">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
                          <div style="display:flex; align-items:center; gap:6px">
                            <span style="font-weight:600; font-size:12px; color:${isCurrent ? 'var(--cu)' : 'var(--text-1)'}">
                              Phase ${ph.phase_number}: ${ph.name}
                            </span>
                            ${isCurrent ? `<span class="badge" style="background:var(--cu); color:#000; font-size:9.5px; font-weight:700">CURRENT</span>` : ''}
                          </div>
                          <span style="font-size:10.5px; color:var(--text-3)">
                            ${ph.execution_mode.toUpperCase()} • ~${ph.estimated_seconds}s
                          </span>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-2); margin-bottom:6px">${ph.description}</div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px">
                          ${ph.agents.map((ag) => `
                            <span class="badge" style="font-size:10px; background:rgba(255,255,255,0.05); color:var(--text-2); border:1px solid var(--line-2)" title="${ag.role}">
                              #${ag.number} ${ag.name}
                            </span>
                          `).join('')}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>

                <details style="background:var(--ink-900); border:1px solid var(--line-2); border-radius:6px; padding:8px 12px; font-size:11px">
                  <summary style="cursor:pointer; color:var(--text-2); font-weight:600; user-select:none">
                    View Full Department Head Plan JSON
                  </summary>
                  <pre style="margin-top:8px; padding:8px 0; font-family:var(--font-mono, monospace); font-size:11px; line-height:1.45; color:var(--cu-light, #E2B088); max-height:220px; overflow-y:auto; white-space:pre-wrap"><code>${JSON.stringify(plan, null, 2)}</code></pre>
                </details>
              ` : `
                <div style="font-size:12px; color:var(--text-3)">Execution plan not built yet. Click <b>Generate Plan</b> to create.</div>
              `}
            </div>

            <!-- MISSION BRIEF SECTION (Agent #2 Output) -->
            <div style="background:var(--ink-800); border:1px solid var(--line-2); border-radius:10px; padding:14px; margin-bottom:16px">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                <div style="display:flex; align-items:center; gap:8px">
                  <span style="font-size:15px">📋</span>
                  <span style="font-size:13px; font-weight:600; color:var(--text-1)">Agent #2 Mission Brief</span>
                  <span class="badge badge-parsed" style="font-size:10px">v${criteria.parser_version || '1.0'}</span>
                </div>
                <div style="display:flex; gap:6px">
                  <button class="btn btn-outline btn-copy-json" style="height:24px; padding:0 8px; font-size:11px" type="button">
                    Copy Brief JSON
                  </button>
                  <button class="btn btn-outline btn-reparse-action" style="height:24px; padding:0 8px; font-size:11px" type="button">
                    Re-run Parser
                  </button>
                </div>
              </div>

              ${brief ? `
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; margin-bottom:12px">
                  <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px">
                    <div style="font-size:10.5px; color:var(--text-3)">Countries Policy</div>
                    <div style="font-size:12px; font-weight:600; color:var(--text-1); margin-top:2px">
                      ${brief.countries.mode === 'auto_potential' ? 'Auto-Potential (Agent #10)' : `${brief.countries.list.length} Selected`}
                    </div>
                  </div>
                  <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px">
                    <div style="font-size:10.5px; color:var(--text-3)">Approval Gate</div>
                    <div style="font-size:12px; font-weight:600; color:var(--text-1); margin-top:2px">
                      ${brief.approval_gate.auto_approve ? '1-Click Autonomous' : 'Pause after Discovery'}
                    </div>
                  </div>
                  <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px">
                    <div style="font-size:10.5px; color:var(--text-3)">Business Models</div>
                    <div style="font-size:12px; font-weight:600; color:var(--text-1); margin-top:2px">
                      ${(brief.business_modes || []).join(', ')}
                    </div>
                  </div>
                </div>

                <details style="background:var(--ink-900); border:1px solid var(--line-2); border-radius:6px; padding:8px 12px; font-size:11px">
                  <summary style="cursor:pointer; color:var(--text-2); font-weight:600; user-select:none">
                    View Structured Brief JSON payload
                  </summary>
                  <pre style="margin-top:8px; padding:8px 0; font-family:var(--font-mono, monospace); font-size:11px; line-height:1.45; color:var(--cu-light, #E2B088); max-height:220px; overflow-y:auto; white-space:pre-wrap"><code>${JSON.stringify(brief, null, 2)}</code></pre>
                </details>
              ` : `
                <div style="font-size:12px; color:var(--text-3)">No brief parsed yet. Click <b>Re-run Parser</b> to generate.</div>
              `}
            </div>

            <!-- Target Countries Tray -->
            <div style="margin-bottom:16px">
              <div class="section-label">Target Countries (${countries.length})</div>
              ${countries.length === 0 ? `
                <div style="font-size:12px; color:var(--em); padding:8px 12px; background:var(--ink-800); border:1px solid var(--line-cu); border-radius:8px">
                  Auto-select mode active — Country Potential Intelligence Agent (#10) will populate all viable markets in Phase 1.
                </div>
              ` : `
                <div style="display:flex; flex-wrap:wrap; gap:8px">
                  ${countries.map((c) => {
                    const flag = window.NRDCountrySelector?.getFlagEmoji(c.country_code) || '🌐';
                    return `
                      <div class="cs-tray-chip" style="animation:none">
                        <span class="cs-tc-flag">${flag}</span>
                        <span class="cs-tc-name">${c.country_name || c.country_code}</span>
                        <span class="cs-tc-code">${c.country_code}</span>
                        <span class="badge" style="font-size:9.5px">${(c.potential_score || 0).toFixed(1)}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

            <!-- 35 Agents Status Matrix -->
            <div>
              <div class="section-label">35-Agent Layer Status Matrix</div>
              <div class="agent-status-matrix">
                ${Object.entries(layers).map(([layerKey, layerData]) => `
                  <div class="asm-layer">
                    <div class="asm-layer-head">
                      <span>${layerData.name}</span>
                      <span>${layerData.items.length} Agents</span>
                    </div>
                    <div class="asm-agent-list">
                      ${layerData.items.map((ag) => `
                        <div class="asm-agent-item" id="asm-ag-${ag.agent_number}">
                          <div class="asm-agent-name" title="#${ag.agent_number} ${ag.agent_name}">
                            <b style="color:var(--text-3); margin-right:4px">#${ag.agent_number}</b>${ag.agent_name}
                          </div>
                          <span class="asm-agent-pill ${ag.status === 'done' ? 'pill-done' : ag.status === 'running' ? 'pill-running' : ag.status === 'skipped' ? 'pill-skipped' : ag.status === 'failed' ? 'pill-failed' : ''}">${ag.status}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;

          // Event listeners for inside the modal
          const copyBtn = mdContent.querySelector('.btn-copy-json');
          if (copyBtn && brief) {
            copyBtn.addEventListener('click', async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(brief, null, 2));
                copyBtn.textContent = 'Copied ✓';
                setTimeout(() => { copyBtn.textContent = 'Copy Brief JSON'; }, 2000);
              } catch {
                copyBtn.textContent = 'Copied ✓';
              }
            });
          }

          const copyPlanBtn = mdContent.querySelector('.btn-copy-plan');
          if (copyPlanBtn && plan) {
            copyPlanBtn.addEventListener('click', async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
                copyPlanBtn.textContent = 'Copied ✓';
                setTimeout(() => { copyPlanBtn.textContent = 'Copy Plan JSON'; }, 2000);
              } catch {
                copyPlanBtn.textContent = 'Copied ✓';
              }
            });
          }

          const rebuildPlanBtn = mdContent.querySelector('.btn-rebuild-plan');
          if (rebuildPlanBtn) {
            rebuildPlanBtn.addEventListener('click', async () => {
              rebuildPlanBtn.disabled = true;
              rebuildPlanBtn.textContent = 'Building…';
              try {
                if (window.dbAPI && typeof window.dbAPI.buildPlan === 'function') {
                  await window.dbAPI.buildPlan(runId);
                } else {
                  await fetch(`/api/db/runs/${runId}/plan`, { method: 'POST' });
                }
                if (window.NRDToast) {
                  window.NRDToast.show({
                    type: 'success',
                    title: 'Execution Plan Ready',
                    msg: 'Agent #1 Department Head generated updated execution plan.',
                  });
                }
                await renderDetails();
              } catch (err) {
                console.error('[NewResearch] Build plan error:', err);
                if (window.NRDToast) {
                  window.NRDToast.show({
                    type: 'error',
                    title: 'Plan Build Failed',
                    msg: err.message,
                  });
                }
                rebuildPlanBtn.disabled = false;
                rebuildPlanBtn.textContent = 'Generate Plan';
              }
            });
          }

          // Chain Engine Actions: Start / Pause / Resume / Cancel / Approve
          const bindAction = (selector, actionFn) => {
            const btn = modalEl.querySelector(selector);
            if (btn) {
              btn.addEventListener('click', async () => {
                btn.disabled = true;
                try {
                  await actionFn();
                  await renderDetails();
                  if (typeof loadRunsLedger === 'function') loadRunsLedger();
                } catch (err) {
                  console.error('[NewResearch] Chain action error:', err);
                  if (window.NRDToast) {
                    window.NRDToast.show({ type: 'error', title: 'Action Error', msg: err.message });
                  }
                  btn.disabled = false;
                }
              });
            }
          };

          bindAction('.btn-mc-start', async () => {
            if (window.engineAPI && typeof window.engineAPI.startRun === 'function') {
              await window.engineAPI.startRun(runId);
            } else {
              await fetch(`/api/engine/runs/${runId}/start`, { method: 'POST' });
            }
            if (window.NRDToast) {
              window.NRDToast.show({ type: 'success', title: 'Chain Started', msg: `Run #${runId} execution is in progress.` });
            }
          });

          bindAction('.btn-mc-pause', async () => {
            if (window.engineAPI && typeof window.engineAPI.pauseRun === 'function') {
              await window.engineAPI.pauseRun(runId);
            } else {
              await fetch(`/api/engine/runs/${runId}/pause`, { method: 'POST' });
            }
            if (window.NRDToast) {
              window.NRDToast.show({ type: 'info', title: 'Chain Paused', msg: `Run #${runId} will pause after current agent.` });
            }
          });

          bindAction('.btn-mc-cancel', async () => {
            if (window.engineAPI && typeof window.engineAPI.cancelRun === 'function') {
              await window.engineAPI.cancelRun(runId);
            } else {
              await fetch(`/api/engine/runs/${runId}/cancel`, { method: 'POST' });
            }
            if (window.NRDToast) {
              window.NRDToast.show({ type: 'warning', title: 'Chain Cancelled', msg: `Run #${runId} execution cancelled.` });
            }
          });

          bindAction('.btn-mc-approve', async () => {
            if (window.engineAPI && typeof window.engineAPI.approveRun === 'function') {
              await window.engineAPI.approveRun(runId);
            } else {
              await fetch(`/api/engine/runs/${runId}/approve`, { method: 'POST' });
            }
            if (window.NRDToast) {
              window.NRDToast.show({ type: 'success', title: 'Run Approved', msg: `Run #${runId} approved. Proceeding with Deep Research.` });
            }
          });

          const reparseBtns = mdContent.querySelectorAll('.btn-reparse-action');
          reparseBtns.forEach((btn) => {
            btn.addEventListener('click', async () => {
              btn.disabled = true;
              btn.textContent = 'Parsing…';
              try {
                let parseRes = null;
                if (window.dbAPI && typeof window.dbAPI.parseRun === 'function') {
                  parseRes = await window.dbAPI.parseRun(runId);
                } else {
                  const res = await fetch(`/api/db/runs/${runId}/parse`, { method: 'POST' });
                  parseRes = await res.json();
                }

                if (parseRes && parseRes.success) {
                  if (window.NRDToast) {
                    window.NRDToast.show({
                      type: 'success',
                      title: 'Mission Brief Re-parsed',
                      msg: `Generated Brief v${parseRes.version || '1.1'}.`,
                    });
                  }
                } else {
                  if (window.NRDToast) {
                    window.NRDToast.show({
                      type: 'error',
                      title: 'Parse Failed',
                      msg: parseRes?.error || 'Validation error',
                    });
                  }
                }

                await renderDetails();
                if (typeof loadRunsLedger === 'function') loadRunsLedger();
              } catch (err) {
                console.error('[NewResearch] Re-parse error:', err);
                if (window.NRDToast) {
                  window.NRDToast.show({
                    type: 'error',
                    title: 'Re-parse Error',
                    msg: err.message,
                  });
                }
                btn.disabled = false;
                btn.textContent = 'Re-run Parser';
              }
            });
          });
        } catch (err) {
          console.error('[NewResearch] Failed to load run details:', err);
          const mdContent = modalEl.querySelector('#md-content');
          if (mdContent) {
            mdContent.innerHTML = `
              <div style="color:#E07A6A; padding:20px">
                Failed to load run details: ${err.message}
              </div>
            `;
          }
        }
      };

      // Subscribe to real-time execution events while modal is open
      if (window.engineAPI) {
        if (typeof window.engineAPI.onRunStatus === 'function') {
          unsubscribeRunStatus = window.engineAPI.onRunStatus((evt) => {
            if (evt && evt.runId === runId) {
              renderDetails();
              if (typeof loadRunsLedger === 'function') loadRunsLedger();
            }
          });
        }
        if (typeof window.engineAPI.onAgentStatus === 'function') {
          unsubscribeAgentStatus = window.engineAPI.onAgentStatus((evt) => {
            if (evt && evt.runId === runId) {
              const agItem = modalEl.querySelector(`#asm-ag-${evt.agentNumber}`);
              if (agItem) {
                const pill = agItem.querySelector('.asm-agent-pill');
                if (pill) {
                  pill.textContent = evt.status;
                  pill.className = `asm-agent-pill ${evt.status === 'done' ? 'pill-done' : evt.status === 'running' ? 'pill-running' : evt.status === 'skipped' ? 'pill-skipped' : evt.status === 'failed' ? 'pill-failed' : ''}`;
                }
              }
            }
          });
        }
      }

      renderDetails();
    },

    destroy() {
      if (this._onSettingsChanged) {
        window.removeEventListener('nrd:settings-changed', this._onSettingsChanged);
      }
      if (this._csInstance && typeof this._csInstance.destroy === 'function') {
        this._csInstance.destroy();
      }
    },
  };
})();
