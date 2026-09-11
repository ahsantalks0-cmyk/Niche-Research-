'use strict';

/**
 * NRD · theme.js — dark/light theme manager with cross-fade + persistence.
 * Exposes window.NRDTheme { init, set, toggle, current }.
 */
(function () {
  let current = 'dark';
  let veil = null;
  let veilTimer = null;
  const listeners = new Set();

  function apply(cls) {
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(cls);
  }

  /** Cross-fade: fade a full-screen veil in, switch, fade out. */
  function transitionTo(next) {
    if (!veil) return apply(next === 'light' ? 'theme-light' : 'theme-dark');
    veil.classList.add('active');
    clearTimeout(veilTimer);
    veilTimer = setTimeout(() => {
      apply(next === 'light' ? 'theme-light' : 'theme-dark');
      current = next;
      listeners.forEach((fn) => { try { fn(next); } catch { /* noop */ } });
      setTimeout(() => veil.classList.remove('active'), 60);
    }, 200);
  }

  window.NRDTheme = {
    init(saved) {
      veil = document.getElementById('theme-veil');
      current = saved === 'light' ? 'light' : 'dark';
      apply(current === 'light' ? 'theme-light' : 'theme-dark');
      // no transition on first paint
      if (veil) veil.style.transition = 'none';
      requestAnimationFrame(() => { if (veil) veil.style.transition = ''; });
    },
    set(next) {
      if (next === current) return;
      transitionTo(next);
      if (window.nrd) window.nrd.setSettings({ theme: next });
    },
    toggle() {
      this.set(current === 'dark' ? 'light' : 'dark');
    },
    get current() { return current; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();
