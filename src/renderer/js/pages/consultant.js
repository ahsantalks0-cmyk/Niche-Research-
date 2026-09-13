'use strict';

/**
 * NRD · pages/consultant.js — Senior Consultant Chat Agent UI (P2.1)
 * 
 * Features:
 * - Full-height Noir Atelier interface with thread management sidebar (New, Switch, Delete).
 * - Live conversational interface backed by SQLite consultant_chats and consultant_messages.
 * - Real DB data grounding (runs, niches, schedules, quality stats).
 * - Action Confirmation Cards for DH proposed actions (starting runs, toggling/deleting schedules).
 * - Markdown rendering for rich text formatting.
 * - Quick prompt chips for fast strategy questions.
 */
(function () {
  window.NRDPages = window.NRDPages || {};

  let activeChatId = null;
  let chatsList = [];
  let isSending = false;

  const escapeHtml = (str) => {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const renderMarkdown = (str = '') => {
    if (!str) return '';
    let html = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, '<pre style="background:var(--ink-950, #09090b); padding:10px; border-radius:6px; overflow-x:auto; font-family:monospace; font-size:11px; border:1px solid var(--border); margin:8px 0"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 5px; border-radius:4px; font-family:monospace; font-size:11.5px">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li style="margin-left:16px; margin-bottom:4px">$1</li>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    return html;
  };

  window.NRDPages.consultant = {
    title: 'Senior Consultant',

    render() {
      const el = document.createElement('div');
      el.className = 'page active';
      el.id = 'page-consultant';
      el.style.cssText = 'display:flex; height:calc(100vh - 65px); overflow:hidden; gap:0; padding:0; background:var(--bg)';

      el.innerHTML = `
        <!-- Threads Sidebar -->
        <div style="width:260px; min-width:260px; background:var(--ink-950, #09090b); border-right:1px solid var(--line); display:flex; flex-direction:column">
          <div style="padding:14px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center">
            <div style="font-weight:600; font-size:13px; color:var(--text-1); display:flex; align-items:center; gap:6px">
              <span>👨‍💼 Strategy Chats</span>
            </div>
            <button class="btn btn-cu" id="btn-new-chat" style="padding:4px 10px; font-size:11px">+ New Chat</button>
          </div>
          <div id="consultant-threads-list" style="flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:4px">
            <div style="text-align:center; padding:12px; color:var(--text-dim); font-size:11px">Loading threads…</div>
          </div>
        </div>

        <!-- Main Chat Canvas -->
        <div style="flex:1; display:flex; flex-direction:column; background:var(--bg); overflow:hidden">
          <!-- Chat Header -->
          <div style="padding:12px 20px; border-bottom:1px solid var(--line); background:var(--ink-900, #121214); display:flex; justify-content:space-between; align-items:center">
            <div>
              <h3 id="chat-thread-title" style="margin:0; font-size:14.5px; font-weight:600; color:var(--text-1)">Strategy Consultation</h3>
              <div style="font-size:11px; color:var(--text-dim); margin-top:2px">Senior Niche Research Consultant (15+ Years Experience)</div>
            </div>
            <div style="display:flex; align-items:center; gap:10px">
              <span class="badge badge-done" style="font-size:10px; padding:3px 8px"><span class="bdot"></span>Active Advisor</span>
              <button class="btn btn-outline" id="btn-delete-thread" style="padding:3px 8px; font-size:11px; color:#f87171; border-color:rgba(248,113,113,0.3)" title="Delete Current Thread">🗑️ Delete</button>
            </div>
          </div>

          <!-- Quick Prompt Chips -->
          <div style="padding:8px 16px; background:var(--ink-950, #09090b); border-bottom:1px solid var(--border); display:flex; gap:8px; overflow-x:auto; flex-shrink:0">
            <button class="btn btn-outline prompt-chip" data-prompt="What are my top 5 niches?" style="font-size:11px; padding:3px 10px; white-space:nowrap">🏆 Top 5 Niches</button>
            <button class="btn btn-outline prompt-chip" data-prompt="Show Quality Supervisor pass rate" style="font-size:11px; padding:3px 10px; white-space:nowrap">🛡️ Quality Pass Rate</button>
            <button class="btn btn-outline prompt-chip" data-prompt="Summarize scheduler status" style="font-size:11px; padding:3px 10px; white-space:nowrap">⏱️ Scheduler Status</button>
            <button class="btn btn-outline prompt-chip" data-prompt="Check active research runs" style="font-size:11px; padding:3px 10px; white-space:nowrap">🚀 Active Runs</button>
            <button class="btn btn-outline prompt-chip" data-prompt="mjhe top niches dikhao aur run shuru karo" style="font-size:11px; padding:3px 10px; white-space:nowrap">🇵🇰 Roman Urdu Demo</button>
          </div>

          <!-- Messages Scroll Box -->
          <div id="consultant-messages-container" style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px">
            <div style="text-align:center; padding:30px; color:var(--text-dim); font-size:12px">
              Select or create a strategy thread to begin consultation.
            </div>
          </div>

          <!-- Input Controls -->
          <div style="padding:12px 20px; border-top:1px solid var(--line); background:var(--ink-900, #121214)">
            <div style="display:flex; gap:10px; align-items:center">
              <input class="input" id="consultant-input" type="text" placeholder="Ask about niches, strategy, or propose actions (Roman Urdu or English)…" style="flex:1; font-size:13px; padding:10px 14px" />
              <button class="btn btn-cu" id="consultant-send" style="padding:10px 18px; font-size:13px">
                Send ➔
              </button>
            </div>
            <div style="font-size:10.5px; color:var(--text-dim); margin-top:6px; display:flex; justify-content:space-between">
              <span>💡 Grounded in live SQLite database · Action proposals require explicit UI confirmation.</span>
              <span id="consultant-status-hint">Ready</span>
            </div>
          </div>
        </div>
      `;
      return el;
    },

    mounted() {
      const btnNewChat = document.getElementById('btn-new-chat');
      const btnDeleteThread = document.getElementById('btn-delete-thread');
      const consultantInput = document.getElementById('consultant-input');
      const consultantSend = document.getElementById('consultant-send');
      const threadsContainer = document.getElementById('consultant-threads-list');
      const messagesContainer = document.getElementById('consultant-messages-container');
      const threadTitle = document.getElementById('chat-thread-title');
      const statusHint = document.getElementById('consultant-status-hint');

      // Scroll to bottom helper
      const scrollToBottom = () => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      };

      // Render Messages
      const renderMessages = (messages = []) => {
        if (!messagesContainer) return;

        if (messages.length === 0) {
          messagesContainer.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-dim); font-size:12px; border:1px dashed var(--line); border-radius:8px; margin:auto; max-width:480px">
              <div style="font-size:24px; margin-bottom:8px">👨‍💼</div>
              <div style="font-weight:600; color:var(--text-1); font-size:14px; margin-bottom:4px">Senior Niche Research Consultant</div>
              <div>Ask questions about your research runs, niche scores, market competition, or automated schedules.</div>
            </div>
          `;
          return;
        }

        messagesContainer.innerHTML = messages.map((m) => {
          const isUser = m.role === 'user';
          const avatar = isUser ? 'YOU' : 'SC';
          const bg = isUser ? 'var(--ink-800, #1e1e22)' : 'var(--ink-950, #09090b)';
          const border = isUser ? 'var(--line)' : 'var(--border)';
          const name = isUser ? 'Department Head' : 'Senior Consultant';
          const time = m.created_at ? new Date(m.created_at).toLocaleTimeString() : '';

          let toolCardsHtml = '';
          if (m.tool_calls) {
            try {
              const tools = typeof m.tool_calls === 'string' ? JSON.parse(m.tool_calls) : m.tool_calls;
              if (Array.isArray(tools)) {
                toolCardsHtml = tools.map((t) => {
                  if (t.type === 'action_proposal') {
                    return `
                      <div class="action-proposal-card" style="margin-top:10px; padding:12px 14px; background:rgba(245, 158, 11, 0.08); border:1px solid rgba(245, 158, 11, 0.35); border-radius:8px">
                        <div style="font-weight:600; color:#fbbf24; font-size:12px; margin-bottom:4px; display:flex; align-items:center; gap:6px">
                          <span>⚡ Action Confirmation Required: ${escapeHtml(t.title || t.action)}</span>
                        </div>
                        <div style="font-size:11.5px; color:var(--text-2); margin-bottom:10px">
                          ${escapeHtml(t.description || 'Confirm execution of this proposed Department Head action.')}
                        </div>
                        <div style="display:flex; gap:8px">
                          <button class="btn btn-cu btn-confirm-action" data-proposal='${escapeHtml(JSON.stringify(t))}' style="font-size:11px; padding:4px 12px; background:#f59e0b; border-color:#d97706; color:#000; font-weight:600">
                            ✓ Confirm Action
                          </button>
                          <button class="btn btn-outline btn-cancel-action" style="font-size:11px; padding:4px 12px">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    `;
                  }
                  return '';
                }).join('');
              }
            } catch (err) {
              console.warn('[consultant] tool_calls parse error:', err.message);
            }
          }

          return `
            <div style="display:flex; gap:12px; align-items:flex-start; ${isUser ? 'flex-direction:row-reverse' : ''}">
              <div style="width:32px; height:32px; border-radius:6px; background:${isUser ? 'var(--accent, #6366f1)' : 'var(--ink-800, #27272a)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0">
                ${avatar}
              </div>
              <div style="max-width:80%; background:${bg}; border:1px solid ${border}; border-radius:8px; padding:12px 16px">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:6px; font-size:11px; color:var(--text-dim)">
                  <span style="font-weight:600; color:${isUser ? 'var(--text-1)' : '#a1a1aa'}">${name}</span>
                  <span>${time}</span>
                </div>
                <div style="font-size:13px; line-height:1.55; color:var(--text-1)">
                  ${renderMarkdown(m.content)}
                </div>
                ${toolCardsHtml}
              </div>
            </div>
          `;
        }).join('');

        scrollToBottom();

        // Wire Action Buttons
        messagesContainer.querySelectorAll('.btn-confirm-action').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const raw = btn.getAttribute('data-proposal');
            if (!raw) return;
            btn.disabled = true;
            btn.textContent = 'Executing…';
            try {
              const proposal = JSON.parse(raw);
              if (window.consultantAPI && window.consultantAPI.executeAction) {
                const res = await window.consultantAPI.executeAction(proposal);
                NRDToast.show({ type: 'success', title: 'Action Executed', msg: res.message });
                // Refresh messages
                loadMessages(activeChatId);
              }
            } catch (err) {
              NRDToast.show({ type: 'error', title: 'Execution Failed', msg: err.message });
              btn.disabled = false;
              btn.textContent = '✓ Confirm Action';
            }
          });
        });

        messagesContainer.querySelectorAll('.btn-cancel-action').forEach((btn) => {
          btn.addEventListener('click', () => {
            const card = btn.closest('.action-proposal-card');
            if (card) card.style.display = 'none';
          });
        });
      };

      // Load Thread Messages
      const loadMessages = async (chatId) => {
        if (!chatId || !window.consultantAPI) return;
        try {
          const msgs = await window.consultantAPI.getMessages(chatId);
          renderMessages(msgs);
        } catch (err) {
          console.warn('[consultant] loadMessages error:', err.message);
        }
      };

      // Render Threads List
      const renderThreads = () => {
        if (!threadsContainer) return;
        if (!chatsList || chatsList.length === 0) {
          threadsContainer.innerHTML = `<div style="text-align:center; padding:12px; color:var(--text-dim); font-size:11px">No chats yet. Click + New Chat.</div>`;
          return;
        }

        threadsContainer.innerHTML = chatsList.map((c) => {
          const isActive = c.id === activeChatId;
          return `
            <div class="consultant-thread-item" data-id="${c.id}" style="padding:8px 10px; border-radius:6px; background:${isActive ? 'var(--ink-800, #1e1e22)' : 'transparent'}; border:1px solid ${isActive ? 'var(--line)' : 'transparent'}; cursor:pointer; font-size:12px; transition:all 0.15s">
              <div style="font-weight:${isActive ? '600' : '500'}; color:${isActive ? 'var(--text-1)' : 'var(--text-2)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                💬 ${escapeHtml(c.title || 'Strategy Consultation')}
              </div>
              <div style="font-size:10px; color:var(--text-dim); margin-top:2px">
                ${c.updated_at ? new Date(c.updated_at).toLocaleDateString() : ''}
              </div>
            </div>
          `;
        }).join('');

        threadsContainer.querySelectorAll('.consultant-thread-item').forEach((item) => {
          item.addEventListener('click', () => {
            const cid = Number(item.dataset.id);
            if (cid !== activeChatId) {
              activeChatId = cid;
              const current = chatsList.find((x) => x.id === cid);
              if (threadTitle && current) threadTitle.textContent = current.title || 'Strategy Consultation';
              renderThreads();
              loadMessages(activeChatId);
            }
          });
        });
      };

      // Load All Threads
      const loadThreads = async () => {
        if (!window.consultantAPI || !window.consultantAPI.getChats) return;
        try {
          chatsList = await window.consultantAPI.getChats();
          if (chatsList.length > 0 && !activeChatId) {
            activeChatId = chatsList[0].id;
            if (threadTitle) threadTitle.textContent = chatsList[0].title || 'Strategy Consultation';
          }
          renderThreads();
          if (activeChatId) loadMessages(activeChatId);
        } catch (err) {
          console.warn('[consultant] loadThreads error:', err.message);
        }
      };

      // Send Message Handler
      const sendMessageHandler = async () => {
        if (isSending) return;
        const text = consultantInput ? consultantInput.value.trim() : '';
        if (!text) return;

        if (!activeChatId) {
          // Auto create thread if none
          if (window.consultantAPI && window.consultantAPI.createChat) {
            const newChat = await window.consultantAPI.createChat('Strategy Consultation');
            activeChatId = newChat.id;
            await loadThreads();
          }
        }

        isSending = true;
        if (consultantSend) {
          consultantSend.disabled = true;
          consultantSend.textContent = 'Thinking…';
        }
        if (statusHint) statusHint.textContent = 'Consultant is analyzing DB context…';
        if (consultantInput) consultantInput.value = '';

        // Temporarily render user message immediately
        const tempMsgsContainer = messagesContainer;
        if (tempMsgsContainer) {
          const userDiv = document.createElement('div');
          userDiv.style.cssText = 'display:flex; gap:12px; align-items:flex-start; flex-direction:row-reverse';
          userDiv.innerHTML = `
            <div style="width:32px; height:32px; border-radius:6px; background:var(--accent, #6366f1); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0">YOU</div>
            <div style="max-width:80%; background:var(--ink-800, #1e1e22); border:1px solid var(--line); border-radius:8px; padding:12px 16px">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:6px; font-size:11px; color:var(--text-dim)">
                <span style="font-weight:600; color:var(--text-1)">Department Head</span>
                <span>Just now</span>
              </div>
              <div style="font-size:13px; line-height:1.55; color:var(--text-1)">${renderMarkdown(text)}</div>
            </div>
          `;
          tempMsgsContainer.appendChild(userDiv);

          // Render typing indicator
          const typingDiv = document.createElement('div');
          typingDiv.id = 'consultant-typing-indicator';
          typingDiv.style.cssText = 'display:flex; gap:12px; align-items:flex-start';
          typingDiv.innerHTML = `
            <div style="width:32px; height:32px; border-radius:6px; background:var(--ink-800, #27272a); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; flex-shrink:0">SC</div>
            <div style="background:var(--ink-950, #09090b); border:1px solid var(--border); border-radius:8px; padding:12px 16px; color:var(--text-dim); font-size:12px">
              <span class="typing"><i></i><i></i><i></i></span> Senior Consultant is reviewing data…
            </div>
          `;
          tempMsgsContainer.appendChild(typingDiv);
          scrollToBottom();
        }

        try {
          if (window.consultantAPI && window.consultantAPI.sendMessage) {
            const res = await window.consultantAPI.sendMessage(activeChatId, text);
            renderMessages(res.messages);
          }
        } catch (err) {
          NRDToast.show({ type: 'error', title: 'Consultant Error', msg: err.message });
          loadMessages(activeChatId);
        } finally {
          isSending = false;
          if (consultantSend) {
            consultantSend.disabled = false;
            consultantSend.textContent = 'Send ➔';
          }
          if (statusHint) statusHint.textContent = 'Ready';
        }
      };

      // Events Wiring
      if (btnNewChat) {
        btnNewChat.addEventListener('click', async () => {
          if (!window.consultantAPI) return;
          try {
            const newChat = await window.consultantAPI.createChat(`Strategy Session #${chatsList.length + 1}`);
            activeChatId = newChat.id;
            if (threadTitle) threadTitle.textContent = newChat.title;
            await loadThreads();
            NRDToast.show({ type: 'info', title: 'New Chat Created', msg: 'Started new strategy session.' });
          } catch (err) {
            NRDToast.show({ type: 'error', title: 'Create Failed', msg: err.message });
          }
        });
      }

      if (btnDeleteThread) {
        btnDeleteThread.addEventListener('click', async () => {
          if (!activeChatId || !window.consultantAPI) return;
          if (confirm(`Are you sure you want to delete Chat Thread #${activeChatId}?`)) {
            try {
              await window.consultantAPI.deleteChat(activeChatId);
              NRDToast.show({ type: 'info', title: 'Thread Deleted', msg: `Deleted chat thread #${activeChatId}.` });
              activeChatId = null;
              await loadThreads();
            } catch (err) {
              NRDToast.show({ type: 'error', title: 'Delete Failed', msg: err.message });
            }
          }
        });
      }

      if (consultantSend) consultantSend.addEventListener('click', sendMessageHandler);

      if (consultantInput) {
        consultantInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageHandler();
          }
        });
      }

      // Prompt Chips wiring
      document.querySelectorAll('.prompt-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const prompt = chip.dataset.prompt;
          if (prompt && consultantInput) {
            consultantInput.value = prompt;
            sendMessageHandler();
          }
        });
      });

      // Initial Load
      loadThreads();
    },

    destroy() {
      activeChatId = null;
      chatsList = [];
      isSending = false;
    },
  };
})();
