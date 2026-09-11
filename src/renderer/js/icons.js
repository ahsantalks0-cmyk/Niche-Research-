'use strict';

/**
 * NRD · icons.js — inline SVG icon library (stroke style, 24px grid).
 * Usage: NRDIcons.get('spark') → SVG string; NRDIcons.el('spark') → element
 */
(function () {
  const S = (d, extra = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

  const LIB = {
    spark: S('<path d="M12 3l1.9 5.6L20 10l-5 3.4.6 6.1-3.6-3.4-4.6 2.3 2-5.6L5 10l5.6-1z"/>'),
    compass: S('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
    cart: S('<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2.4l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.3L20 8H6"/>'),
    file: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    coins: S('<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6"/><path d="M4.5 12v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6"/>'),
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18z"/>'),
    doc: S('<path d="M6 2.5h8.5L19 7v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 21V4a1.5 1.5 0 0 1 1-1.5z"/><path d="M14 2.5V7h4.5"/>'),
    chat: S('<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-3.2-.6L3 20.5l1.4-5a8 8 0 0 1-1-3.9A8.4 8.4 0 0 1 11.9 3.2 8.4 8.4 0 0 1 21 11.5z"/>'),
    send: S('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>'),
    sun: S('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6"/>'),
    moon: S('<path d="M21 12.8A8.6 8.6 0 1 1 11.2 3 6.9 6.9 0 0 0 21 12.8z"/>'),
    trend: S('<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5h-5"/>'),
    search: S('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    layers: S('<path d="M12 2l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/>'),
    pen: S('<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 3 21.5l1-4.5z"/>'),
    box: S('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v9"/>'),
    download: S('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
    refresh: S('<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>'),
    check: S('<path d="M20 6L9 17l-5-5"/>'),
    x: S('<path d="M18 6L6 18M6 6l12 12"/>'),
    info: S('<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>'),
    alert: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>'),
    users: S('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.4A6.5 6.5 0 0 1 21.5 20"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
    key: S('<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M17 6l2.5 2.5M14.5 8.5L17 11"/>'),
    sliders: S('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>'),
    star: S('<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/>'),
    arrowUp: S('<path d="M12 19V5M5 12l7-7 7 7"/>'),
    filter: S('<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>'),
    sort: S('<path d="M7 3v18M7 21l-3-3M7 21l3-3M17 21V3M17 3l-3 3M17 3l3 3"/>'),
    play: S('<path d="M6 4l14 8-14 8z"/>'),
    shield: S('<path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>'),
  };

  const cached = {};

  window.NRDIcons = {
    /** @returns {string} svg markup */
    get(name) {
      if (!cached[name]) {
        cached[name] = LIB[name] || LIB.info;
      }
      return cached[name];
    },
    /** @returns {HTMLElement} */
    el(name, cls) {
      const tpl = document.createElement('template');
      tpl.innerHTML = this.get(name).trim();
      const svg = tpl.content.firstElementChild;
      if (cls) svg.setAttribute('class', cls);
      return svg;
    },
    has(name) { return Object.prototype.hasOwnProperty.call(LIB, name); },
  };
})();
