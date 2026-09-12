'use strict';

/**
 * NRD · captcha-banner.js — CAPTCHA Safety Net Controller (Part 4).
 * Handles audio chime playback, sticky alert banner, elapsed timer, and auto-dismissal on resolution.
 */

window.NRDCaptchaBanner = (function () {
  let activeAlerts = new Map(); // slotId -> { domain, startTime, intervalId }

  function getBannerEl() {
    return document.getElementById('captcha-banner');
  }

  function playChime() {
    try {
      const audio = document.getElementById('audio-chime');
      if (audio) {
        audio.currentTime = 0;
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // Audio autoplay policy fallback: synthetic beep with Web Audio API
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.4);
            } catch {}
          });
        }
      }
    } catch {}
  }

  function formatElapsed(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateBannerUI() {
    const banner = getBannerEl();
    if (!banner) return;

    if (activeAlerts.size === 0) {
      banner.style.display = 'none';
      return;
    }

    // Pick the most recent active alert
    const [latestSlotId, alert] = Array.from(activeAlerts.entries())[activeAlerts.size - 1];

    const slotBadge = document.getElementById('cb-slot-badge');
    if (slotBadge) slotBadge.textContent = `Slot #${latestSlotId}`;

    const domainEl = document.getElementById('cb-domain');
    if (domainEl) domainEl.textContent = alert.domain || 'google.com';

    banner.style.display = 'flex';
  }

  function show(slotId, domain) {
    playChime();

    // Clear existing interval for slot if any
    if (activeAlerts.has(slotId)) {
      clearInterval(activeAlerts.get(slotId).intervalId);
    }

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
      const timerEl = document.getElementById('cb-timer');
      if (timerEl) timerEl.textContent = formatElapsed(elapsedSec);
    }, 1000);

    activeAlerts.set(slotId, {
      domain: domain || 'google.com',
      startTime,
      intervalId,
    });

    updateBannerUI();

    if (window.NRDToast) {
      window.NRDToast.show({
        type: 'warning',
        title: `CAPTCHA Alert · Slot #${slotId}`,
        msg: `Human challenge on ${domain || 'Google'}. Slot is paused — other slots continue!`,
      });
    }
  }

  function resolve(slotId) {
    if (activeAlerts.has(slotId)) {
      clearInterval(activeAlerts.get(slotId).intervalId);
      activeAlerts.delete(slotId);
    }

    updateBannerUI();

    if (window.NRDToast) {
      window.NRDToast.show({
        type: 'success',
        title: `CAPTCHA Resolved · Slot #${slotId}`,
        msg: `Challenge cleared! Slot #${slotId} has resumed search operations. Zero work lost.`,
      });
    }
  }

  function init() {
    const dismissBtn = document.getElementById('btn-cb-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        const banner = getBannerEl();
        if (banner) banner.style.display = 'none';
      });
    }

    if (window.engineAPI) {
      window.engineAPI.onCaptchaDetected((data) => {
        show(data.slotId || 1, data.domain || 'google.com');
      });

      window.engineAPI.onCaptchaResolved((data) => {
        resolve(data.slotId || 1);
      });
    }
  }

  return {
    init,
    show,
    resolve,
  };
})();
