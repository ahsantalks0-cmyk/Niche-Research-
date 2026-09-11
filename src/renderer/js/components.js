'use strict';

/**
 * NRD · components.js — chart factory (Noir Atelier): emerald × copper.
 */
(function () {
  const CHART_FONT = "'Outfit', sans-serif";

  function fmtNum(n) {
    return new Intl.NumberFormat('en-US').format(n);
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function isDark() {
    return document.documentElement.classList.contains('theme-dark');
  }

  function chartPalette() {
    return {
      cu: cssVar('--cu'),
      cuSoft: cssVar('--cu-soft'),
      em: cssVar('--em'),
      text2: cssVar('--text-2'),
      text3: cssVar('--text-3'),
      grid: cssVar('--chart-grid'),
      tooltipBg: cssVar('--chart-tip'),
      tooltipText: cssVar('--text'),
      ramp: isDark()
        ? ['#C98B5F', '#34D399', '#A96B41', '#7BCFAF', '#8B8880']
        : ['#A4653A', '#0B7C55', '#83502E', '#0E9F6E', '#7C7870'],
    };
  }

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

  /** Copper glowing area line chart. */
  function lineChart(canvas, labels, data) {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const h = canvas.height || 268;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(201, 139, 95, 0.30)');
    grad.addColorStop(0.6, 'rgba(201, 139, 95, 0.06)');
    grad.addColorStop(1, 'rgba(52, 211, 153, 0.00)');
    const opts = baseOptions(p, { legend: false, xTicks: 7 });
    opts.elements = {
      line: { tension: 0.38, capBezierPoints: true },
      point: { radius: 0, hoverRadius: 4, hoverBorderWidth: 0, hoverBackgroundColor: p.cuSoft },
    };
    opts.interaction = { mode: 'index', intersect: false };
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: p.cu,
          borderWidth: 2,
          fill: true,
          backgroundColor: grad,
          pointHoverRadius: 4,
        }],
      },
      options: opts,
    });
  }

  /** Donut with copper/emerald categorical ramp; HTML legend by caller. */
  function donutChart(canvas, labels, data) {
    const p = chartPalette();
    const opts = baseOptions(p, { scales: false, legend: false });
    opts.cutout = '72%';
    opts.elements = { arc: { borderWidth: 0, borderRadius: 5, spacing: 3 } };
    opts.plugins.tooltip.callbacks = { label: (ctx) => ` ${ctx.parsed}% — ${ctx.label}` };
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: p.ramp.slice(0, labels.length),
          hoverBackgroundColor: p.cuSoft,
          hoverOffset: 6,
        }],
      },
      options: opts,
    });
  }

  /** Copper gradient bars with emerald hover. */
  function barChart(canvas, labels, data) {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const h = canvas.height || 268;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#E8B98F');
    g.addColorStop(1, 'rgba(52, 211, 153, 0.35)');
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
          hoverBackgroundColor: p.em,
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

  /** KPI sparkline — copper hairline with soft fill. */
  function sparkline(canvas, data) {
    const p = chartPalette();
    const ctx = canvas.getContext('2d');
    const h = canvas.height || 26;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(201, 139, 95, 0.28)');
    grad.addColorStop(1, 'rgba(201, 139, 95, 0)');
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: p.cu,
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

  window.NRDUI = {
    fmtNum,
    chartPalette,
    lineChart,
    donutChart,
    barChart,
    sparkline,
  };
})();
