'use strict';

/**
 * NRD · icons.js — inline SVG icon library (stroke style, 24px grid).
 */
(function () {
  const S = (d, extra = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;

  const LIB = {
    compass: S('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
    cart: S('<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2.4l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.6-1.3L20 8H6"/>'),
    doc: S('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
    coins: S('<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6"/><path d="M4.5 12v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6"/>'),
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18 14.5 14.5 0 0 1 0-18z"/>'),
    chat: S('<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-3.2-.6L3 20.5l1.4-5a8 8 0 0 1-1-3.9A8.4 8.4 0 0 1 11.9 3.2 8.4 8.4 0 0 1 21 11.5z"/>'),
    send: S('<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>'),
    sun: S('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6"/>'),
    moon: S('<path d="M21 12.8A8.6 8.6 0 1 1 11.2 3 6.9 6.9 0 0 0 21 12.8z"/>'),
    trend: S('<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5h-5"/>'),
    search: S('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    pen: S('<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 3 21.5l1-4.5z"/>'),
    box: S('<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v9"/>'),
    download: S('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
    refresh: S('<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>'),
    check: S('<path d="M20 6L9 17l-5-5"/>'),
    x: S('<path d="M18 6L6 18M6 6l12 12"/>'),
    info: S('<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>'),
    alert: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>'),
    star: S('<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/>'),
    play: S('<path d="M6 4l14 8-14 8z"/>'),
    filter: S('<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>'),
    sort: S('<path d="M7 3v18M7 21l-3-3M7 21l3-3M17 21V3M17 3l-3 3M17 3l3 3"/>'),
    shield: S('<path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>'),
    key: S('<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8L20 3M17 6l2.5 2.5M14.5 8.5L17 11"/>'),
    terminal: S('<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>'),
    layers: S('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/>'),
    pause: S('<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'),
    stop: S('<rect x="4" y="4" width="16" height="16" rx="2"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/>'),
    zap: S('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    code: S('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
    arrowLeft: S('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
    chevronDown: S('<polyline points="6 9 12 15 18 9"/>'),
    chevronRight: S('<polyline points="9 18 15 12 9 6"/>'),
  };

  const cached = {};

  window.NRDIcons = {
    get(name) {
      if (!cached[name]) cached[name] = LIB[name] || LIB.info;
      return cached[name];
    },
  };
})();
