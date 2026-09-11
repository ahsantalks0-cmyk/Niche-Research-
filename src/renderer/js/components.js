'use strict';

/**
 * NRD · components.js — shared UI helpers v3 (Midnight Aurora):
 * theme-aware Chart.js factory — champagne × violet on deep plum glass.
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

  /* --------------------------- chart color system --------------------------- */

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function isDark() {
    return document.documentElement.classList.contains('theme-dark');
  }

  /** Theme-aware aurora palette. */
  function chartPalette() {
    return {
      gold: cssVar('--gold'),
      goldSoft: cssVar('--gold-soft'),
      violet: cssVar('--violet'),
      violet2: cssVar('--violet-2'),
      text2: cssVar('--text-2'),
      text3: cssVar('--text-3'),
      grid: cssVar('--chart-grid'),
      tooltipBg: cssVar('--chart-tooltip'),
      tooltipText: cssVar('--text'),
      // categorical ramp: champagne leads, violet accents
      ramp: isDark()
        ? ['#E3C57E', '#8B6CF0', '#C9A25B', '#B7A5F7', '#6E6879']
        : ['#A87F3B', '#6C4FD8', '#8E6A2E', '#8B72E8', '#928B9E'],
    };
  }

  /* ------------------------------- chart factory ---------------------------- */

  function baseOptions(p, extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: document.body.classList.contains('reduce-motion') ? 0 : 850,
        easing: 'easeOutQuart',
      },
      layout: { padding: { top: 6 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: p.tooltipBg,
          titleColor: p.tooltipText,
          bodyColor: p.text2,
          titleFont: { family: CHART_FONT, weight: '600', size: 12 },
          bodyFont: { family: CHART_FONT, size: 11.5 },
          borderColor: p.grid,
          borderWidth: 1,
          padding: { x: 12, y: 9 },
          cornerRadius: 10,
          displayColors: false,
          titleMarginBottom: 6,
        },
      },
      scales: extra.scales === false ? undefined : {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: p.text3,
            font: { family: CHART_FONT, size: 10.5 },
            maxRotation: 0,
            maxTicksLimit: extra.xTicks || 8,
          },
        },
        y: {
          grid: { color: p.grid, drawTicks: false },
          border: { display: false },
          ticks: {
            color: p.text3,
            font: { family: CHART_FONT, size: 10.5 },
            maxTicksLimit: 5,
            padding: 8,
          },
        },
      },
    };
  }

  /**
   * Line chart — glowing champagne area over plum glass.
   * @returns {Chart}
   */
  function lineChart(canvas, labels, data) {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const h = canvas.height || 272;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(227, 197, 126, 0.28)');
    grad.addColorStop(0.55, 'rgba(227, 197, 126, 0.07)');
    grad.addColorStop(1, 'rgba(139, 108, 240, 0.00)');
    const opts = baseOptions(p, { legend: false, xTicks: 7 });
    opts.elements = {
      line: { tension: 0.38, capBezierPoints: true },
      point: { radius: 0, hoverRadius: 4, hoverBorderWidth: 0, hoverBackgroundColor: p.goldSoft },
    };
    opts.interaction = { mode: 'index', intersect: false };
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: p.gold,
          borderWidth: 2,
          fill: true,
          backgroundColor: grad,
          pointHoverRadius: 4,
          borderJoinStyle: 'round',
        }],
      },
      options: opts,
    });
  }

  /**
   * Donut — champagne/violet categorical ramp; legend drawn in HTML.
   * @returns {Chart}
   */
  function donutChart(canvas, labels, data) {
    const p = chartPalette();
    const opts = baseOptions(p, { scales: false, legend: false });
    opts.cutout = '72%';
    opts.elements = { arc: { borderWidth: 0, borderRadius: 5, spacing: 3 } };
    opts.plugins.tooltip.callbacks = {
      label: (ctx) => ` ${ctx.parsed}% — ${ctx.label}`,
    };
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: p.ramp.slice(0, labels.length),
          hoverBackgroundColor: p.goldSoft,
          hoverOffset: 6,
        }],
      },
      options: opts,
    });
  }

  /**
   * Bar chart — champagne gradient bars with violet hover.
   * @returns {Chart}
   */
  function barChart(canvas, labels, data) {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const h = canvas.height || 272;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#F0D9A0');
    g.addColorStop(1, 'rgba(139, 108, 240, 0.45)');
    const opts = baseOptions(p, { legend: false, xTicks: labels.length });
    opts.scales.y.beginAtZero = true;
    opts.scales.y.max = 100;
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: g,
          hoverBackgroundColor: p.goldSoft,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 30,
          barPercentage: 0.58,
          categoryPercentage: 0.74,
        }],
      },
      options: opts,
    });
  }

  /**
   * Mini sparkline — champagne hairline with soft glow fill.
   * @returns {Chart}
   */
  function sparkline(canvas, data) {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const h = canvas.height || 36;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(227, 197, 126, 0.30)');
    grad.addColorStop(1, 'rgba(227, 197, 126, 0)');
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: p.gold,
          borderWidth: 1.5,
          fill: true,
          backgroundColor: grad,
          tension: 0.42,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        elements: { line: { tension: 0.42, capBezierPoints: true } },
      },
    });
  }

  /** Destroy the Chart bound to a canvas, if any. */
  function destroyChart(canvas) {
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
  }

  window.NRDUI = {
    fmtNum,
    fmtDate,
    chartPalette,
    lineChart,
    donutChart,
    barChart,
    sparkline,
    destroyChart,
  };
})();
