'use strict';

/**
 * NRD · components.js — shared UI helpers: animated counters, Chart.js factory
 * with theme-aware gold/teal palettes, sparklines, formatters.
 */
(function () {
  const CHART_FONT = "'Outfit', sans-serif";

  /* ------------------------------ formatters ------------------------------- */

  function fmtNum(n) {
    return new Intl.NumberFormat('en-US').format(n);
  }

  function fmtDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  /* ---------------------------- animated counter ---------------------------- */

  /**
   * Animate a numeric counter inside `el` from 0 to target with easeOutCubic.
   * @param {HTMLElement} el
   * @param {number} target
   * @param {{ ms?: number, suffix?: string, decimals?: number }} opts
   */
  function animateCounter(el, target, opts = {}) {
    const { ms = 1200, suffix = '', decimals = 0 } = opts;
    const reduce = document.body.classList.contains('reduce-motion');
    if (reduce) {
      el.textContent = fmtNum(+(target).toFixed(decimals)) + suffix;
      return;
    }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtNum(+(target * eased).toFixed(decimals)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* --------------------------- chart color system --------------------------- */

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /** Theme-aware palettes + axis/grid colors for Chart.js */
  function chartPalette() {
    const dark = document.documentElement.classList.contains('theme-dark');
    const gold = cssVar('--gold');
    const goldBright = cssVar('--gold-bright');
    const teal = cssVar('--teal');
    const text2 = cssVar('--text-2');
    const text3 = cssVar('--text-3');
    const line = dark ? 'rgba(255,255,255,0.06)' : 'rgba(23,33,51,0.08)';
    return {
      dark,
      gold, goldBright, teal,
      text2, text3,
      grid: line,
      tooltipBg: dark ? 'rgba(10,13,22,0.94)' : 'rgba(255,255,255,0.97)',
      tooltipText: dark ? '#E5E7EB' : '#1D2537',
      lineGrad: dark
        ? ['rgba(212,175,55,0.32)', 'rgba(212,175,55,0)']
        : ['rgba(176,141,47,0.28)', 'rgba(176,141,47,0)'],
      donut: dark
        ? ['#D4AF37', '#38C7B8', '#B08D2F', '#7FC4E8', '#8C6D1F']
        : ['#B08D2F', '#0F9C8E', '#1D2537', '#C9A544', '#5C6470'],
      bar: dark
        ? { from: '#D4AF37', to: '#8C6D1F' }
        : { from: '#1D2537', to: '#B08D2F' },
    };
  }

  /* ------------------------------- chart factory ---------------------------- */

  function baseOptions(p, extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: document.body.classList.contains('reduce-motion') ? 0 : 900,
        easing: 'easeOutCubic',
      },
      plugins: {
        legend: {
          display: extra.legend !== false,
          position: 'bottom',
          labels: {
            color: p.text2,
            font: { family: CHART_FONT, size: 11.5, weight: 500 },
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: p.tooltipBg,
          titleColor: p.tooltipText,
          bodyColor: p.text2,
          titleFont: { family: CHART_FONT, weight: '600' },
          bodyFont: { family: CHART_FONT, size: 12 },
          borderColor: p.grid,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
        },
      },
      scales: extra.scales === false ? {} : {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: p.text3,
            font: { family: CHART_FONT, size: 11 },
            maxRotation: 0,
          },
        },
        y: {
          grid: { color: p.grid },
          border: { display: false },
          ticks: {
            color: p.text3,
            font: { family: CHART_FONT, size: 11 },
            maxTicksLimit: 6,
          },
        },
      },
    };
  }

  /**
   * Line/area chart with gold gradient fill.
   * @returns {Chart}
   */
  function lineChart(canvas, labels, data) {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    grad.addColorStop(0, p.lineGrad[0]);
    grad.addColorStop(1, p.lineGrad[1]);
    const opts = baseOptions(p, {
      legend: false,
      scales: { tension: 0.4 },
    });
    opts.elements = {
      line: { tension: 0.4 },
      point: { radius: 0, hoverRadius: 5, hoverBorderWidth: 2, hoverBorderColor: p.goldBright },
    };
    opts.interaction = { mode: 'index', intersect: false };
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: p.gold,
          borderWidth: 2.2,
          fill: true,
          backgroundColor: grad,
          pointHoverBackgroundColor: p.goldBright,
        }],
      },
      options: opts,
    });
  }

  /**
   * Donut chart with gold/teal palette.
   * @returns {Chart}
   */
  function donutChart(canvas, labels, data) {
    const p = chartPalette();
    const opts = baseOptions(p, { scales: false });
    opts.cutout = '68%';
    opts.animation.animateRotate = true;
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: p.donut,
          borderColor: p.dark ? 'rgba(11,14,23,0.9)' : '#FFFFFF',
          borderWidth: 3,
          hoverOffset: 8,
          borderRadius: 6,
        }],
      },
      options: opts,
    });
  }

  /**
   * Vertical bar chart with per-bar vertical gradient.
   * @returns {Chart}
   */
  function barChart(canvas, labels, data) {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    g.addColorStop(0, p.bar.from);
    g.addColorStop(1, p.bar.to);
    const opts = baseOptions(p, { legend: false });
    opts.scales.y.beginAtZero = true;
    opts.scales.y.max = 100;
    opts.scales.y.ticks.callback = (v) => `${v}%`;
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: g,
          hoverBackgroundColor: p.goldBright,
          borderRadius: 7,
          borderSkipped: false,
          maxBarThickness: 34,
        }],
      },
      options: opts,
    });
  }

  /**
   * Mini sparkline for KPI cards (no axes, no tooltip).
   * @returns {Chart}
   */
  function sparkline(canvas, data, colorVar = '--gold') {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const h = canvas.height || 36;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, p.lineGrad[0]);
    grad.addColorStop(1, p.lineGrad[1]);
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: cssVar(colorVar),
          borderWidth: 1.8,
          fill: true,
          backgroundColor: grad,
          tension: 0.45,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1100, easing: 'easeOutCubic' },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        elements: { line: { tension: 0.45 } },
      },
    });
  }

  /** Destroy and rebuild all charts on a canvas parent (theme switch helper). */
  function destroyChart(canvas) {
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
  }

  window.NRDUI = {
    fmtNum,
    fmtDate,
    animateCounter,
    chartPalette,
    lineChart,
    donutChart,
    barChart,
    sparkline,
    destroyChart,
  };
})();
