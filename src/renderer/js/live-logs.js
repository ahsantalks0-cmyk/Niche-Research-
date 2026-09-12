'use strict';

/**
 * NRD · live-logs.js — Live Engine Telemetry & Terminal UI Controller (Part 6).
 * Handles streaming log ingestion, filtering, auto-scroll, slot monitoring, export, and toggle.
 */

window.NRDLiveLogs = (function () {
  const MAX_LOGS = 1000;
  let logs = [];
  let currentFilter = 'all';
  let autoScroll = true;
  let isOpen = false;
  let slots = [
    { id: 1, status: 'idle', currentDomain: null, lastActivity: null },
    { id: 2, status: 'idle', currentDomain: null, lastActivity: null },
    { id: 3, status: 'idle', currentDomain: null, lastActivity: null },
  ];

  function getDrawerEl() {
    return document.getElementById('live-logs-drawer');
  }

  function getTerminalEl() {
    return document.getElementById('lld-terminal');
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return '';
    }
  }

  function getTagClass(log) {
    const c = (log.category || log.level || '').toLowerCase();
    if (c.includes('agent')) return 'tag-agent';
    if (c.includes('qs')) return 'tag-qs';
    if (c.includes('chain')) return 'tag-chain';
    if (c.includes('llm')) return 'tag-llm';
    if (c.includes('browser')) return 'tag-browser';
    if (c.includes('rate')) return 'tag-rate-limit';
    if (c.includes('cache')) return 'tag-cache';
    if (c.includes('captcha')) return 'tag-captcha';
    if (c.includes('timing')) return 'tag-timing';
    if (c.includes('error')) return 'tag-error';
    return 'tag-info';
  }

  function matchesFilter(log, filter) {
    if (filter === 'all') return true;
    const cat = (log.category || log.level || '').toLowerCase();
    const f = filter.toLowerCase();
    if (f === 'rate-limit' || f === 'rate') return cat.includes('rate');
    return cat.includes(f);
  }

  function renderRow(log) {
    const row = document.createElement('div');
    row.className = 'terminal-row';
    row.dataset.level = (log.category || log.level || 'info').toLowerCase();

    const time = document.createElement('span');
    time.className = 'terminal-time';
    time.textContent = formatTime(log.timestamp);

    const tag = document.createElement('span');
    tag.className = `terminal-tag ${getTagClass(log)}`;
    tag.textContent = (log.category || log.level || 'INFO').toUpperCase();

    const msg = document.createElement('span');
    msg.className = 'terminal-msg';
    
    // Format message with highlighted slot if present
    let text = log.message || '';
    if (log.slotId) {
      text = `[Slot #${log.slotId}] ${text}`;
    }
    if (log.details && Object.keys(log.details).length > 0) {
      try {
        const detailsStr = JSON.stringify(log.details);
        if (detailsStr !== '{}') {
          text += ` · ${detailsStr}`;
        }
      } catch {}
    }
    msg.textContent = text;

    row.appendChild(time);
    row.appendChild(tag);
    row.appendChild(msg);

    return row;
  }

  function updateCountBadge() {
    const countEl = document.getElementById('lld-log-count');
    if (countEl) {
      countEl.textContent = `${logs.length} events`;
    }
  }

  function renderSlots() {
    const container = document.getElementById('lld-slots-chips');
    if (!container) return;
    container.innerHTML = '';

    slots.forEach((s) => {
      const chip = document.createElement('div');
      chip.className = `slot-chip ${s.status}`;
      chip.title = `Slot #${s.id}: ${s.status}${s.currentDomain ? ' (' + s.currentDomain + ')' : ''}`;

      const dot = document.createElement('span');
      dot.className = 'dot';

      const label = document.createElement('span');
      label.textContent = `S#${s.id}: ${s.status.toUpperCase()}`;

      chip.appendChild(dot);
      chip.appendChild(label);
      container.appendChild(chip);
    });
  }

  function appendLog(logEntry) {
    logs.push(logEntry);
    if (logs.length > MAX_LOGS) {
      logs.shift();
    }

    updateCountBadge();

    const terminal = getTerminalEl();
    if (!terminal) return;

    // Remove empty placeholder
    const emptyEl = terminal.querySelector('.terminal-empty');
    if (emptyEl) emptyEl.remove();

    if (matchesFilter(logEntry, currentFilter)) {
      const row = renderRow(logEntry);
      terminal.appendChild(row);

      // Keep DOM from blowing up
      while (terminal.children.length > MAX_LOGS) {
        terminal.removeChild(terminal.firstChild);
      }

      if (autoScroll) {
        terminal.scrollTop = terminal.scrollHeight;
      }
    }

    // Pulse dot in topbar if panel is closed
    if (!isOpen) {
      const dot = document.getElementById('logs-active-dot');
      if (dot) dot.style.display = 'block';
    }
  }

  function reRenderTerminal() {
    const terminal = getTerminalEl();
    if (!terminal) return;
    terminal.innerHTML = '';

    const filtered = logs.filter((l) => matchesFilter(l, currentFilter));
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'terminal-empty';
      empty.textContent = logs.length === 0 ? 'Waiting for engine operations…' : 'No logs matching selected filter';
      terminal.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach((log) => {
      frag.appendChild(renderRow(log));
    });
    terminal.appendChild(frag);

    if (autoScroll) {
      terminal.scrollTop = terminal.scrollHeight;
    }
  }

  function toggle() {
    isOpen = !isOpen;
    const drawer = getDrawerEl();
    if (drawer) {
      drawer.style.display = isOpen ? 'flex' : 'none';
    }

    const dot = document.getElementById('logs-active-dot');
    if (isOpen && dot) dot.style.display = 'none';

    if (isOpen) {
      reRenderTerminal();
      renderSlots();
    }
  }

  function open() {
    if (!isOpen) toggle();
  }

  function close() {
    if (isOpen) toggle();
  }

  function clear() {
    logs = [];
    updateCountBadge();
    reRenderTerminal();
  }

  function copyToClipboard() {
    const text = logs
      .map((l) => `[${formatTime(l.timestamp)}] [${(l.level || 'INFO').toUpperCase()}] ${l.slotId ? '[Slot #' + l.slotId + '] ' : ''}${l.message || ''}`)
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      if (window.NRDToast) {
        window.NRDToast.show({
          type: 'success',
          title: 'Logs copied',
          msg: `${logs.length} log lines copied to clipboard.`,
        });
      }
    });
  }

  function exportLogs() {
    const text = logs
      .map((l) => `[${formatTime(l.timestamp)}] [${(l.level || 'INFO').toUpperCase()}] ${l.slotId ? '[Slot #' + l.slotId + '] ' : ''}${l.message || ''}`)
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nrd-engine-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function init() {
    // Button toggle in masthead
    const toggleBtn = document.getElementById('btn-live-logs');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    // Close button
    const closeBtn = document.getElementById('btn-lld-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    // Auto-scroll toggle
    const scrollBtn = document.getElementById('btn-lld-autoscroll');
    if (scrollBtn) {
      scrollBtn.addEventListener('click', () => {
        autoScroll = !autoScroll;
        scrollBtn.classList.toggle('active', autoScroll);
        scrollBtn.textContent = `Auto-Scroll: ${autoScroll ? 'ON' : 'OFF'}`;
      });
    }

    // Copy & Export & Clear
    const copyBtn = document.getElementById('btn-lld-copy');
    if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);

    const exportBtn = document.getElementById('btn-lld-export');
    if (exportBtn) exportBtn.addEventListener('click', exportLogs);

    const clearBtn = document.getElementById('btn-lld-clear');
    if (clearBtn) clearBtn.addEventListener('click', clear);

    // Filters
    document.querySelectorAll('.lld-filters .filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.lld-filters .filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.filter || 'all';
        reRenderTerminal();
      });
    });

    // Wire IPC listeners if engineAPI exists
    if (window.engineAPI) {
      window.engineAPI.onLog((entry) => {
        appendLog(entry);
      });

      window.engineAPI.onSlotsUpdated((updatedSlots) => {
        if (Array.isArray(updatedSlots)) {
          slots = updatedSlots;
          renderSlots();
        }
      });

      // Poll initial slot state
      window.engineAPI.getSlots().then((initialSlots) => {
        if (Array.isArray(initialSlots)) {
          slots = initialSlots;
          renderSlots();
        }
      }).catch(() => {});
    }

    // Initial slot rendering
    renderSlots();
  }

  return {
    init,
    toggle,
    open,
    close,
    clear,
    appendLog,
    getLogs: () => [...logs],
  };
})();
