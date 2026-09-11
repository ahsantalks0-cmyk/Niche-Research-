'use strict';

/**
 * NRD · pages/consultant.js — Senior Consultant chat (Phase 2 placeholder).
 * Premium chat shell: bubbles, typing indicator, input + send (non-functional).
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  window.NRDPages.consultant = {
    title: 'Consultant Chat',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-consultant';

      el.innerHTML = `
        <div class="page-head" style="display:flex; align-items:center; justify-content:space-between">
          <div>
            <h2>Senior Consultant</h2>
            <p>Your private strategy analyst over the whole research department.</p>
          </div>
          <span class="badge badge-done"><span class="bdot"></span>PHASE 2</span>
        </div>

        <div class="chat-shell">
          <div class="chat-scroll" id="chat-scroll">
            <div class="msg consultant">
              <div class="m-avatar">${NRDIcons.get('spark')}</div>
              <div>
                <div class="m-bubble">
                  Good evening. I am the Senior Consultant — once Phase 2 ships, I will review
                  every niche dossier, compare business modes and advise you on where to invest
                  next. Meanwhile, the department is preparing its agent roster.
                  <span class="m-time">Today · just now</span>
                </div>
              </div>
            </div>
            <div class="msg consultant">
              <div class="m-avatar">${NRDIcons.get('spark')}</div>
              <div>
                <div class="m-bubble">
                  <span class="typing"><i></i><i></i><i></i></span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="chat-input-row">
              <input class="input" id="chat-input" type="text"
                     placeholder="Ask about niches, monetization, competition…" disabled />
              <button class="btn btn-gold" id="chat-send" disabled title="Coming in Phase 2">
                ${NRDIcons.get('send')} Send
              </button>
            </div>
            <div class="chat-note">Senior Consultant — coming in Phase 2</div>
          </div>
        </div>
      `;
      return el;
    },

    mounted() {
      // Non-functional placeholder: input + send stay disabled until Phase 2.
    },

    destroy() { /* no charts */ },
  };
})();
