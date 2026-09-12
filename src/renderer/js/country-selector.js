'use strict';

/**
 * NRD · country-selector.js — Reusable Country Selection System (Noir Atelier).
 * Loads countries from SQLite via dbAPI.getCountries().
 * Features: Live search, multi-select, presets (Top 5, Tier 1, Asia, Clear),
 * sorting (score / name), selected chips tray, AI auto-select banner, and detail popover.
 */
(function () {
  /**
   * Helper: converts country code to Unicode regional indicator flag emoji.
   * @param {string} code 2-letter country code
   * @returns {string} flag emoji
   */
  function getFlagEmoji(code) {
    if (!code) return '🌐';
    const c = code.trim().toUpperCase();
    if (c === 'UK') return '🇬🇧';
    if (c.length !== 2) return '🌐';
    try {
      const codePoints = c.split('').map((char) => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return '🌐';
    }
  }

  /**
   * Helper: format number with commas / decimals
   */
  function fmtNum(n, decimals = 1) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  }

  class CountrySelector {
    /**
     * @param {object} options
     * @param {HTMLElement | string} options.container Target DOM container or selector
     * @param {string[]} [options.initialSelected=[]] Pre-selected country codes
     * @param {(selectedCodes: string[], isAuto: boolean) => void} [options.onChange] Callback on selection change
     */
    constructor(options = {}) {
      this.container = typeof options.container === 'string'
        ? document.querySelector(options.container)
        : options.container;

      this.onChange = options.onChange || (() => {});
      this.countries = [];
      this.selectedCodes = new Set(options.initialSelected || []);
      this.searchTerm = '';
      this.sortBy = 'score'; // 'score' | 'name'
      this.isLoading = true;
      this.loadError = null;

      // Active popover reference
      this.activePopoverEl = null;

      this._init();
    }

    async _init() {
      if (!this.container) return;
      this.render();
      await this.loadData();
    }

    async loadData() {
      try {
        this.isLoading = true;
        this.loadError = null;
        this._updateLoadingState();

        if (window.dbAPI && typeof window.dbAPI.getCountries === 'function') {
          const res = await window.dbAPI.getCountries(false);
          this.countries = Array.isArray(res) ? res : [];
        } else {
          // Fallback fetch for browser preview
          const res = await fetch('/api/db/countries?activeOnly=0');
          this.countries = await res.json();
        }
      } catch (err) {
        console.error('[CountrySelector] Failed to load countries:', err);
        this.loadError = err.message || 'Failed to load countries from database';
      } finally {
        this.isLoading = false;
        this.render();
        this._notify();
      }
    }

    getSelected() {
      return Array.from(this.selectedCodes);
    }

    setSelected(codes = []) {
      this.selectedCodes = new Set(codes);
      this.render();
      this._notify();
    }

    isAutoSelect() {
      return this.selectedCodes.size === 0;
    }

    _notify() {
      this.onChange(this.getSelected(), this.isAutoSelect());
    }

    _toggleCountry(code) {
      if (this.selectedCodes.has(code)) {
        this.selectedCodes.delete(code);
      } else {
        this.selectedCodes.add(code);
      }
      this._renderTrayAndGrid();
      this._notify();
    }

    _applyPreset(presetKey) {
      if (presetKey === 'clear') {
        this.selectedCodes.clear();
      } else if (presetKey === 'top5') {
        const sorted = [...this.countries].sort((a, b) => (b.potential_score || 0) - (a.potential_score || 0));
        this.selectedCodes = new Set(sorted.slice(0, 5).map((c) => c.country_code));
      } else if (presetKey === 'tier1') {
        // US, UK, Canada, Australia, Germany
        const t1Codes = ['US', 'UK', 'CA', 'AU', 'DE'];
        this.selectedCodes = new Set(t1Codes.filter((c) => this.countries.some((item) => item.country_code === c)));
      } else if (presetKey === 'asia') {
        // Pakistan, India, Bangladesh, Indonesia, Malaysia, Philippines, Vietnam, Thailand
        const asiaCodes = ['PK', 'IN', 'BD', 'ID', 'MY', 'PH', 'VN', 'TH'];
        this.selectedCodes = new Set(asiaCodes.filter((c) => this.countries.some((item) => item.country_code === c)));
      }
      this._renderTrayAndGrid();
      this._notify();
    }

    _getFilteredAndSorted() {
      let list = [...this.countries];
      if (this.searchTerm.trim()) {
        const q = this.searchTerm.trim().toLowerCase();
        list = list.filter((c) =>
          (c.country_name && c.country_name.toLowerCase().includes(q)) ||
          (c.country_code && c.country_code.toLowerCase().includes(q)) ||
          (c.region && c.region.toLowerCase().includes(q)) ||
          (c.language && c.language.toLowerCase().includes(q))
        );
      }

      if (this.sortBy === 'name') {
        list.sort((a, b) => (a.country_name || '').localeCompare(b.country_name || ''));
      } else {
        // Default: potential score descending
        list.sort((a, b) => (b.potential_score || 0) - (a.potential_score || 0));
      }
      return list;
    }

    _renderScoreBadge(score) {
      const s = Number(score) || 0;
      if (s >= 70) {
        return `<span class="cs-badge cs-badge-high" title="High Potential">${s.toFixed(1)}</span>`;
      }
      if (s >= 40) {
        return `<span class="cs-badge cs-badge-med" title="Medium Potential">${s.toFixed(1)}</span>`;
      }
      return `<span class="cs-badge cs-badge-low" title="Emerging / Low Potential">${s.toFixed(1)}</span>`;
    }

    render() {
      if (!this.container) return;

      if (this.isLoading) {
        this.container.innerHTML = `
          <div class="cs-wrapper">
            <div class="cs-header-row">
              <div class="cs-title-group">
                <span class="cs-title">Target Countries</span>
                <span class="cs-count-tag">Loading database…</span>
              </div>
            </div>
            <div style="padding:24px; text-align:center; color:var(--text-3); font-size:13px">
              Loading 30 seeded market profiles from SQLite…
            </div>
          </div>
        `;
        return;
      }

      if (this.loadError) {
        this.container.innerHTML = `
          <div class="cs-wrapper">
            <div class="cs-banner cs-banner-error">
              <span>⚠️ ${this.loadError}</span>
              <button class="btn btn-outline" style="height:28px; padding:0 10px; font-size:11px" id="cs-btn-retry">Retry</button>
            </div>
          </div>
        `;
        const btnRetry = this.container.querySelector('#cs-btn-retry');
        if (btnRetry) btnRetry.addEventListener('click', () => this.loadData());
        return;
      }

      const totalCount = this.countries.length;
      const selectedCount = this.selectedCodes.size;

      this.container.innerHTML = `
        <div class="cs-wrapper" id="cs-root">
          <!-- Top Row: Title, Quick Presets & Clear -->
          <div class="cs-header-row">
            <div class="cs-title-group">
              <span class="cs-title">Target Countries</span>
              <span class="cs-count-tag" id="cs-selected-count">${selectedCount === 0 ? 'Auto-Select Mode' : `${selectedCount} Selected`}</span>
            </div>
            <div class="cs-presets">
              <button type="button" class="cs-preset-btn" data-preset="top5" title="Top 5 Potential markets">
                ⭐ Top 5
              </button>
              <button type="button" class="cs-preset-btn" data-preset="tier1" title="US, UK, Canada, Australia, Germany">
                👑 Tier 1
              </button>
              <button type="button" class="cs-preset-btn" data-preset="asia" title="Pakistan, India, Bangladesh, Southeast Asia">
                🌏 Asia
              </button>
              ${selectedCount > 0 ? `
                <button type="button" class="cs-preset-btn cs-clear-btn" data-preset="clear" title="Reset to AI Auto-select">
                  ✕ Clear
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Tray of Selected Countries (Removable Chips) -->
          <div class="cs-tray" id="cs-tray-container">
            ${this._buildTrayHtml()}
          </div>

          <!-- Auto-Select Banner (Shown when 0 countries selected) -->
          <div class="cs-auto-banner ${selectedCount === 0 ? 'visible' : 'hidden'}" id="cs-auto-banner">
            <div class="cs-ab-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></svg>
            </div>
            <div class="cs-ab-text">
              <strong>No countries selected</strong> — the Country Potential Intelligence Agent (#10) will auto-select all potential countries and research each with equal depth.
            </div>
          </div>

          <!-- Toolbar: Search input + Sort options + Auto-Select shortcut -->
          <div class="cs-toolbar">
            <div class="cs-search-box">
              <svg class="cs-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input type="text" class="cs-search-input" id="cs-search-input" placeholder="Search countries or codes (US, Germany, Pakistan…)" value="${this.searchTerm}" />
              ${this.searchTerm ? `<button type="button" class="cs-clear-search" id="cs-clear-search">✕</button>` : ''}
            </div>

            <div class="cs-toolbar-right">
              <div class="cs-sort-wrap">
                <span class="cs-sort-label">Sort:</span>
                <select class="cs-sort-select" id="cs-sort-select">
                  <option value="score" ${this.sortBy === 'score' ? 'selected' : ''}>Potential Score</option>
                  <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Name (A–Z)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Countries Selection Grid -->
          <div class="cs-grid" id="cs-grid-container">
            ${this._buildGridHtml()}
          </div>

          <!-- Footer Count Note -->
          <div class="cs-footer-note" id="cs-footer-note">
            Showing <b id="cs-visible-count">${this._getFilteredAndSorted().length}</b> of ${totalCount} database countries. Click (ⓘ) on any country to inspect market telemetry.
          </div>
        </div>
      `;

      this._bindEvents();
    }

    _buildTrayHtml() {
      if (this.selectedCodes.size === 0) {
        return `
          <div class="cs-tray-empty">
            <span class="cs-te-chip">🌐 All Potential Markets (AI Discovery Swarm)</span>
          </div>
        `;
      }

      const chips = [];
      for (const code of this.selectedCodes) {
        const country = this.countries.find((c) => c.country_code === code) || { country_code: code, country_name: code };
        const flag = getFlagEmoji(code);
        chips.push(`
          <div class="cs-tray-chip" data-code="${code}">
            <span class="cs-tc-flag">${flag}</span>
            <span class="cs-tc-name">${country.country_name}</span>
            <span class="cs-tc-code">${code}</span>
            <button type="button" class="cs-tc-remove" data-remove="${code}" title="Remove ${country.country_name}">✕</button>
          </div>
        `);
      }
      return chips.join('');
    }

    _buildGridHtml() {
      const items = this._getFilteredAndSorted();
      if (items.length === 0) {
        return `
          <div class="cs-grid-empty">
            <span>No countries found matching "<b>${this.searchTerm}</b>"</span>
            <button type="button" class="btn btn-outline" style="height:30px; font-size:12px; margin-top:8px" id="cs-btn-reset-search">Reset search</button>
          </div>
        `;
      }

      return items.map((c) => {
        const code = c.country_code;
        const isSelected = this.selectedCodes.has(code);
        const flag = getFlagEmoji(code);
        const badge = this._renderScoreBadge(c.potential_score);

        return `
          <div class="cs-card ${isSelected ? 'selected' : ''}" data-code="${code}" tabindex="0" role="checkbox" aria-checked="${isSelected}">
            <div class="cs-card-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <div class="cs-card-flag">${flag}</div>
            <div class="cs-card-info">
              <div class="cs-card-name-row">
                <span class="cs-card-name" title="${c.country_name}">${c.country_name}</span>
                <span class="cs-card-code">${code}</span>
              </div>
              <div class="cs-card-meta">
                <span class="cs-card-region">${c.region || 'Global'}</span>
              </div>
            </div>
            <div class="cs-card-right">
              ${badge}
              <button type="button" class="cs-info-btn" data-info-code="${code}" title="Inspect market data for ${c.country_name}" aria-label="Country Info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    _renderTrayAndGrid() {
      const trayEl = this.container.querySelector('#cs-tray-container');
      const gridEl = this.container.querySelector('#cs-grid-container');
      const bannerEl = this.container.querySelector('#cs-auto-banner');
      const countEl = this.container.querySelector('#cs-selected-count');
      const headerRowEl = this.container.querySelector('.cs-header-row');

      if (trayEl) trayEl.innerHTML = this._buildTrayHtml();
      if (gridEl) gridEl.innerHTML = this._buildGridHtml();
      if (bannerEl) {
        if (this.selectedCodes.size === 0) {
          bannerEl.classList.remove('hidden');
          bannerEl.classList.add('visible');
        } else {
          bannerEl.classList.remove('visible');
          bannerEl.classList.add('hidden');
        }
      }
      if (countEl) {
        countEl.textContent = this.selectedCodes.size === 0
          ? 'Auto-Select Mode'
          : `${this.selectedCodes.size} Selected`;
      }

      // Re-render clear button if needed
      const presetsWrap = this.container.querySelector('.cs-presets');
      if (presetsWrap) {
        const existingClear = presetsWrap.querySelector('.cs-clear-btn');
        if (this.selectedCodes.size > 0 && !existingClear) {
          const clearBtn = document.createElement('button');
          clearBtn.type = 'button';
          clearBtn.className = 'cs-preset-btn cs-clear-btn';
          clearBtn.dataset.preset = 'clear';
          clearBtn.title = 'Reset to AI Auto-select';
          clearBtn.textContent = '✕ Clear';
          presetsWrap.appendChild(clearBtn);
        } else if (this.selectedCodes.size === 0 && existingClear) {
          existingClear.remove();
        }
      }

      this._bindGridItemEvents();
    }

    _bindEvents() {
      // Presets buttons delegation
      const presetsWrap = this.container.querySelector('.cs-presets');
      if (presetsWrap) {
        presetsWrap.addEventListener('click', (e) => {
          const btn = e.target.closest('.cs-preset-btn');
          if (btn && btn.dataset.preset) {
            this._applyPreset(btn.dataset.preset);
          }
        });
      }

      // Search input
      const searchInput = this.container.querySelector('#cs-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchTerm = e.target.value;
          const gridEl = this.container.querySelector('#cs-grid-container');
          const visibleCountEl = this.container.querySelector('#cs-visible-count');
          if (gridEl) gridEl.innerHTML = this._buildGridHtml();
          if (visibleCountEl) visibleCountEl.textContent = this._getFilteredAndSorted().length;

          // Toggle search clear button
          let clearBtn = this.container.querySelector('#cs-clear-search');
          if (this.searchTerm && !clearBtn) {
            clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'cs-clear-search';
            clearBtn.id = 'cs-clear-search';
            clearBtn.textContent = '✕';
            searchInput.parentNode.appendChild(clearBtn);
            clearBtn.addEventListener('click', () => {
              this.searchTerm = '';
              searchInput.value = '';
              clearBtn.remove();
              gridEl.innerHTML = this._buildGridHtml();
              if (visibleCountEl) visibleCountEl.textContent = this._getFilteredAndSorted().length;
              this._bindGridItemEvents();
            });
          } else if (!this.searchTerm && clearBtn) {
            clearBtn.remove();
          }

          this._bindGridItemEvents();
        });
      }

      const clearSearchBtn = this.container.querySelector('#cs-clear-search');
      if (clearSearchBtn && searchInput) {
        clearSearchBtn.addEventListener('click', () => {
          this.searchTerm = '';
          searchInput.value = '';
          clearSearchBtn.remove();
          const gridEl = this.container.querySelector('#cs-grid-container');
          if (gridEl) gridEl.innerHTML = this._buildGridHtml();
          this._bindGridItemEvents();
        });
      }

      // Sort Select
      const sortSelect = this.container.querySelector('#cs-sort-select');
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          this.sortBy = e.target.value;
          const gridEl = this.container.querySelector('#cs-grid-container');
          if (gridEl) gridEl.innerHTML = this._buildGridHtml();
          this._bindGridItemEvents();
        });
      }

      // Tray chip removal delegation
      const trayContainer = this.container.querySelector('#cs-tray-container');
      if (trayContainer) {
        trayContainer.addEventListener('click', (e) => {
          const removeBtn = e.target.closest('[data-remove]');
          if (removeBtn) {
            const code = removeBtn.dataset.remove;
            this.selectedCodes.delete(code);
            this._renderTrayAndGrid();
            this._notify();
          }
        });
      }

      this._bindGridItemEvents();
    }

    _bindGridItemEvents() {
      // Reset search button if shown in empty state
      const resetBtn = this.container.querySelector('#cs-btn-reset-search');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.searchTerm = '';
          const searchInput = this.container.querySelector('#cs-search-input');
          if (searchInput) searchInput.value = '';
          const clearSearchBtn = this.container.querySelector('#cs-clear-search');
          if (clearSearchBtn) clearSearchBtn.remove();
          const gridEl = this.container.querySelector('#cs-grid-container');
          if (gridEl) gridEl.innerHTML = this._buildGridHtml();
          this._bindGridItemEvents();
        });
      }

      // Country cards selection
      const cards = this.container.querySelectorAll('.cs-card');
      cards.forEach((card) => {
        card.addEventListener('click', (e) => {
          // If clicked the info button, do not toggle selection
          if (e.target.closest('.cs-info-btn')) return;
          const code = card.dataset.code;
          if (code) this._toggleCountry(code);
        });

        card.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            const code = card.dataset.code;
            if (code) this._toggleCountry(code);
          }
        });
      });

      // Info popover buttons
      const infoBtns = this.container.querySelectorAll('.cs-info-btn');
      infoBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const code = btn.dataset.infoCode;
          this._togglePopover(code, btn);
        });

        btn.addEventListener('mouseenter', (e) => {
          const code = btn.dataset.infoCode;
          this._showPopover(code, btn);
        });
      });
    }

    _showPopover(code, anchorEl) {
      this._removePopover();
      const country = this.countries.find((c) => c.country_code === code);
      if (!country) return;

      let localPlatforms = [];
      try {
        if (typeof country.local_platforms === 'string') {
          localPlatforms = JSON.parse(country.local_platforms);
        } else if (Array.isArray(country.local_platforms)) {
          localPlatforms = country.local_platforms;
        }
      } catch {
        localPlatforms = [];
      }

      const flag = getFlagEmoji(code);
      const popover = document.createElement('div');
      popover.className = 'cs-popover';
      popover.id = 'cs-active-popover';

      popover.innerHTML = `
        <div class="cs-pop-header">
          <div class="cs-pop-title-wrap">
            <span class="cs-pop-flag">${flag}</span>
            <div>
              <div class="cs-pop-name">${country.country_name} <span class="cs-pop-code">${code}</span></div>
              <div class="cs-pop-region">${country.region || 'Global'} · ${country.language || 'English'}</div>
            </div>
          </div>
          <div class="cs-pop-score-pill">
            <span class="cs-pop-score-val">${(country.potential_score || 0).toFixed(1)}</span>
            <span class="cs-pop-score-lbl">Score</span>
          </div>
        </div>

        <div class="cs-pop-metrics">
          <div class="cs-pop-metric">
            <div class="cs-pm-label">Internet Users</div>
            <div class="cs-pm-val">${fmtNum(country.internet_users_millions)}M</div>
          </div>
          <div class="cs-pop-metric">
            <div class="cs-pm-label">E-comm Spend</div>
            <div class="cs-pm-val">$${fmtNum(country.ecommerce_spend_usd_billions)}B</div>
          </div>
          <div class="cs-pop-metric">
            <div class="cs-pm-label">Avg. AdSense RPM</div>
            <div class="cs-pm-val text-cu">$${fmtNum(country.avg_adsense_rpm_usd, 2)}</div>
          </div>
          <div class="cs-pop-metric">
            <div class="cs-pm-label">Affiliate Index</div>
            <div class="cs-pm-val text-em">${fmtNum(country.affiliate_ecosystem_score)}/100</div>
          </div>
        </div>

        ${localPlatforms.length > 0 ? `
          <div class="cs-pop-section">
            <div class="cs-pop-sec-title">Local Commerce Platforms</div>
            <div class="cs-pop-platforms">
              ${localPlatforms.map((p) => `<span class="cs-pop-plat-tag">${p}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${country.cultural_notes ? `
          <div class="cs-pop-section">
            <div class="cs-pop-sec-title">Intelligence & Cultural Notes</div>
            <div class="cs-pop-notes">${country.cultural_notes}</div>
          </div>
        ` : ''}
      `;

      document.body.appendChild(popover);
      this.activePopoverEl = popover;

      // Position popover near anchor
      const rect = anchorEl.getBoundingClientRect();
      const popRect = popover.getBoundingClientRect();
      let top = rect.bottom + 8;
      let left = rect.left - popRect.width + 30;

      if (left < 16) left = 16;
      if (left + popRect.width > window.innerWidth - 16) {
        left = window.innerWidth - popRect.width - 16;
      }
      if (top + popRect.height > window.innerHeight - 16) {
        top = rect.top - popRect.height - 8;
      }

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;

      // Auto dismiss on outside click or mouseleave
      const onDocClick = (e) => {
        if (!popover.contains(e.target) && !anchorEl.contains(e.target)) {
          this._removePopover();
          document.removeEventListener('click', onDocClick);
        }
      };
      setTimeout(() => document.addEventListener('click', onDocClick), 50);

      popover.addEventListener('mouseleave', () => {
        this._removePopover();
        document.removeEventListener('click', onDocClick);
      });
    }

    _togglePopover(code, anchorEl) {
      if (this.activePopoverEl) {
        this._removePopover();
      } else {
        this._showPopover(code, anchorEl);
      }
    }

    _removePopover() {
      if (this.activePopoverEl) {
        this.activePopoverEl.remove();
        this.activePopoverEl = null;
      }
    }

    _updateLoadingState() {
      // Handled in render()
    }

    destroy() {
      this._removePopover();
      if (this.container) this.container.innerHTML = '';
    }
  }

  window.NRDCountrySelector = {
    create(options) {
      return new CountrySelector(options);
    },
    getFlagEmoji,
  };
})();
