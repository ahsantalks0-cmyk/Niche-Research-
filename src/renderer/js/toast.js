'use strict';

/**
 * NRD · toast.js — premium toast notifications with icons and auto-dismiss.
 * Exposes window.NRDToast.show({ type, title, msg, timeoutMs }).
 */
(function () {
  let stack = null;

  function ensureStack() {
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  /**
   * @param {{ type?: 'success'|'info'|'error', title: string, msg?: string,
   *           timeoutMs?: number }} opts
   * @returns {() => void} dismiss
   */
  function show(opts) {
    const { type = 'info', title, msg = '', timeoutMs = 5000 } = opts || {};
    const root = ensureStack();

    const el = document.createElement('div');
    el.className = `toast t-${type}`;
    el.setAttribute('role', 'status');

    const iconName = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info';
    el.innerHTML = `
      <div class="t-icon">${window.NRDIcons.get(iconName)}</div>
      <div class="t-body">
        <div class="t-title"></div>
        <div class="t-msg"></div>
      </div>
      <button class="t-close" aria-label="Dismiss">${window.NRDIcons.get('x')}</button>`;

    el.querySelector('.t-title').textContent = title;
    el.querySelector('.t-msg').textContent = msg;
    root.appendChild(el);

    let done = false;
    const dismiss = () => {
      if (done) return;
      done = true;
      el.classList.add('out');
      setTimeout(() => el.remove(), 260);
    };

    el.querySelector('.t-close').addEventListener('click', dismiss);
    if (timeoutMs > 0) setTimeout(dismiss, timeoutMs);
    return dismiss;
  }

  window.NRDToast = { show };
})();
