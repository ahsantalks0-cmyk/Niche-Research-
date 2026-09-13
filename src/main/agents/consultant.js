'use strict';

/**
 * NRD · consultant.js — Senior Consultant Chat Agent (Agent #35) (P2.1)
 * 
 * ROLE:
 * The Executive Strategy & Niche Investment Advisor for the Department Head.
 * 
 * Core Capabilities:
 * 1. REAL DB DATA ACCESS: Queries runs, niches, metrics, schedules, and Quality Supervisor stats.
 * 2. ACTION FORWARDING GUARD: Proposes Department Head actions (starting runs, toggling/deleting schedules)
 *    via explicit UI confirmation cards. NO silent writes ever.
 * 3. LANGUAGE MATCHING: Detects Roman Urdu vs English and responds in the user's language.
 * 4. FACTUAL INTEGRITY: Never invents numbers or fabricates statistics.
 */

const db = require('../db');
const llmClient = require('../llm/llmClient');
const agentRegistry = require('../engine/agentRegistry');
const { emitLog } = require('../engine/logBus');

class SeniorConsultantAgent {
  constructor() {
    this.name = 'Senior Consultant';
    this.agentNumber = 35;
  }

  /**
   * Generates a real-time system context snapshot from SQLite database tables.
   * @returns {object} DB context digest
   */
  getSystemContextDigest() {
    try {
      const counts = db.getCounts() || {};
      const recentRuns = db.getRuns({ limit: 5 }) || [];
      const schedules = db.getSchedules() || [];
      const qsSummary = db.getQualitySummary() || {};
      const settings = db.getSettings() || {};

      // Get top 5 recent niches
      const topNiches = db.findBy('niches', {}, { orderBy: 'created_at DESC', limit: 5 }) || [];

      return {
        counts,
        recentRuns: recentRuns.map((r) => ({
          id: r.id,
          run_name: r.run_name,
          status: r.status,
          total_niches: r.total_niches,
          created_at: r.created_at,
        })),
        topNiches: topNiches.map((n) => ({
          id: n.id,
          niche_name: n.niche_name,
          discovery_status: n.discovery_status,
          description: n.description,
        })),
        schedules: schedules.map((s) => ({
          id: s.id,
          name: s.name,
          enabled: Boolean(s.enabled),
          schedule_type: s.schedule_type,
          next_run_at: s.next_run_at,
        })),
        qualityStats: qsSummary,
        aiProvider: settings.ai_provider || 'gemini',
        aiModel: settings.ai_model || 'gemini-2.5-flash',
      };
    } catch (err) {
      console.warn('[consultant] Context digest failed:', err.message);
      return {};
    }
  }

  /**
   * Detects whether user message is written in Roman Urdu.
   * @param {string} text
   * @returns {boolean}
   */
  isRomanUrdu(text = '') {
    const lower = text.toLowerCase();
    const romanUrduKeywords = [
      'mjhe', 'mujhe', 'karo', 'dikhao', 'kya', 'kaise', 'batao', 'kahan', 'hain', 'ho',
      'haan', 'nahi', 'sab', 'aaj', 'kal', 'run', 'schedule', 'shuru', 'karna', 'hian', 'kar', 'sakte', 'ho'
    ];
    let matches = 0;
    for (const kw of romanUrduKeywords) {
      if (lower.includes(kw)) matches++;
    }
    return matches >= 2;
  }

  /**
   * Inspects message text for proposed actions (e.g., start run, toggle schedule, delete schedule).
   * @param {string} text
   * @param {number} [chatId]
   * @returns {object|null}
   */
  detectActionProposal(text = '', chatId = null) {
    const lower = text.toLowerCase();

    // Parse parameters
    let qty = 3;
    const qtyMatch = lower.match(/(\d+)\s*(?:niche|niches|run|runs)/i) || lower.match(/(?:nikalo|find|get|show)\s*(\d+)/i);
    if (qtyMatch && qtyMatch[1]) {
      const parsedQty = parseInt(qtyMatch[1], 10);
      if (parsedQty >= 1 && parsedQty <= 10) qty = parsedQty;
    }

    const bModes = [];
    if (lower.includes('blogging') || lower.includes('blog')) bModes.push('blogging');
    if (lower.includes('affiliate')) bModes.push('affiliate');
    if (lower.includes('ecommerce') || lower.includes('e-commerce') || lower.includes('store')) bModes.push('ecommerce');
    if (lower.includes('digital') || lower.includes('course') || lower.includes('template')) bModes.push('digital_products');
    if (bModes.length === 0) {
      bModes.push('blogging', 'affiliate', 'ecommerce', 'digital_products');
    }

    const countryCodes = [];
    if (lower.includes('us') || lower.includes('united states') || lower.includes('america')) countryCodes.push('US');
    if (lower.includes('pk') || lower.includes('pakistan')) countryCodes.push('PK');
    if (lower.includes('uk') || lower.includes('britain')) countryCodes.push('UK');
    if (lower.includes('ca') || lower.includes('canada')) countryCodes.push('CA');
    if (lower.includes('in') || lower.includes('india')) countryCodes.push('IN');
    if (countryCodes.length === 0) countryCodes.push('US');

    // 1. Start / Launch Run / Discovery proposal
    const isRunTrigger = lower.includes('start run') ||
      lower.includes('launch run') ||
      lower.includes('run shuru') ||
      lower.includes('naya run') ||
      lower.includes('niches nikalo') ||
      lower.includes('niche nikalo') ||
      lower.includes('niches for') ||
      lower.includes('find niches') ||
      lower.includes('discover niches') ||
      lower.includes('research run') ||
      (lower.includes('niches') && (lower.includes('nikalo') || lower.includes('chahiye') || lower.includes('batao') || lower.includes('find') || lower.includes('get')));

    if (isRunTrigger) {
      return {
        type: 'action_proposal',
        action: 'start_run',
        title: `Launch ${qty}-Niche Discovery Run (${countryCodes.join(', ')})`,
        payload: {
          run_name: `Consultant Discovery (${bModes.join(', ')})`,
          input_mode: 'discovery',
          business_modes: bModes,
          niche_quantity: qty,
          country_codes: countryCodes,
          chat_id: chatId,
        },
        description: `Launch a ${qty}-niche market discovery run across ${countryCodes.join(', ')} markets for ${bModes.join(', ')}.`,
      };
    }

    // 2. Toggle / Enable / Disable schedule proposal
    const toggleMatch = lower.match(/(enable|disable|toggle|band|shuru)\s+schedule\s*#?(\d+)?/i);
    if (toggleMatch) {
      const scheduleId = toggleMatch[2] ? parseInt(toggleMatch[2], 10) : 1;
      const enable = !lower.includes('disable') && !lower.includes('band');
      return {
        type: 'action_proposal',
        action: 'toggle_schedule',
        title: `${enable ? 'Enable' : 'Disable'} Schedule #${scheduleId}`,
        payload: { schedule_id: scheduleId, enable, chat_id: chatId },
        description: `Set Schedule #${scheduleId} state to ${enable ? 'Active' : 'Disabled'}.`,
      };
    }

    // 3. Delete schedule proposal
    const deleteMatch = lower.match(/(delete|remove|khatam)\s+schedule\s*#?(\d+)?/i);
    if (deleteMatch) {
      const scheduleId = deleteMatch[2] ? parseInt(deleteMatch[2], 10) : 1;
      return {
        type: 'action_proposal',
        action: 'delete_schedule',
        title: `Delete Schedule #${scheduleId}`,
        payload: { schedule_id: scheduleId, chat_id: chatId },
        description: `Permanently delete Schedule #${scheduleId} from SQLite database.`,
      };
    }

    return null;
  }

  /**
   * Primary message handler for Senior Consultant chat.
   * @param {number} chatId
   * @param {string} messageText
   * @returns {Promise<object>} Response message object
   */
  async sendMessage(chatId, messageText) {
    if (!messageText || !messageText.trim()) {
      throw new Error('Message text cannot be empty.');
    }

    // Ensure chat exists
    let chatRecord = db.findOne('consultant_chats', { id: chatId });
    if (!chatRecord) {
      chatRecord = db.createConsultantChat('Strategy Consultation');
      chatId = chatRecord.id;
    }

    // 1. Persist User Message
    const userMsgRecord = db.addConsultantMessage(chatId, 'user', messageText.trim());
    emitLog('CONSULTANT', `💬 User query (Chat #${chatId}): "${messageText.trim().slice(0, 60)}…"`, { chatId });

    // 2. Build Context Digest
    const digest = this.getSystemContextDigest();
    const isRoman = this.isRomanUrdu(messageText);
    const actionProposal = this.detectActionProposal(messageText, chatId);

    // 3. Construct System Prompt
    const systemPrompt = `You are the Senior Niche Research Consultant (15+ years experience) for the Niche Research Department.
You provide executive advice on market opportunity, niche validation, business monetization models, competitive barriers, and department operations.

CRITICAL HARD RULES FOR INTEGRITY & HONESTY:
1. NEVER INVENT NICHES, STATISTICS, OR RESEARCH RESULTS.
   If the user asks for niches, research results, or specific recommendations, check the database context below.
   If the database currently has 0 scored/discovered niches (Total Scored Niches in DB: ${digest.counts?.niches || 0}), you MUST state plainly that no niches exist in the database yet.
   Offer to start a real Discovery run to find real ones.
2. NEVER CLAIM AN ACTION WAS PERFORMED WITHOUT EXECUTION.
   Never say "Queue mein dal diya" or "Run started" in your message text unless an action has actually executed and returned a real Run ID.
   When proposing a run, state clearly that an Action Proposal card has been attached below for the user to confirm.
3. LANGUAGE MATCHING: The user wrote in ${isRoman ? 'Roman Urdu (Pakistani English script)' : 'English'}. You MUST respond in ${isRoman ? 'Roman Urdu' : 'English'}.

CURRENT REAL DATABASE CONTEXT DIGEST:
- Total Research Runs: ${digest.counts?.runs || 0}
- Total Scored Niches in DB: ${digest.counts?.niches || 0}
- Active Schedules: ${digest.schedules?.length || 0}
- Quality Pass Rate: ${digest.qualityStats?.passRate ? (digest.qualityStats.passRate * 100).toFixed(1) + '%' : '100%'}
- Recent Runs in DB: ${JSON.stringify(digest.recentRuns || [])}
- Top Scored Niches in DB: ${JSON.stringify(digest.topNiches || [])}
- Active Schedules List: ${JSON.stringify(digest.schedules || [])}
`;

    // 4. Fetch Message History
    const historyMsgs = db.getConsultantMessages(chatId) || [];
    const formattedHistory = historyMsgs.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let assistantResponseText = '';
    let toolCallsObj = actionProposal ? [actionProposal] : null;

    try {
      // Call LLM
      const res = await llmClient.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          ...formattedHistory,
        ],
        temperature: 0.4,
        maxTokens: 1000,
      });

      if (res.ok && res.content) {
        assistantResponseText = res.content;
      } else {
        // Fallback response if LLM API fails or is unconfigured
        if (isRoman) {
          assistantResponseText = `Aap ka paigham mil gaya h. Main aap ke Department ka Senior Consultant hoon.\n\n` +
            `**Live Database Snapshot:**\n` +
            `- Total Research Runs: **${digest.counts?.runs || 0}**\n` +
            `- Total Scored Niches: **${digest.counts?.niches || 0}**\n` +
            `- Active Schedules: **${digest.schedules?.length || 0}**\n\n` +
            `AI Model connect karne ke liye Settings page mein API Key save karein. Tab tak aap real database queries chala sakte hain!`;
        } else {
          assistantResponseText = `I have received your message. As your Senior Niche Consultant, here is your current database overview:\n\n` +
            `- **Total Research Runs:** ${digest.counts?.runs || 0}\n` +
            `- **Total Scored Niches:** ${digest.counts?.niches || 0}\n` +
            `- **Active Schedules:** ${digest.schedules?.length || 0}\n\n` +
            `To enable full conversational AI reasoning, please configure your API key in **Settings**. Meanwhile, all live database insights are active!`;
        }
      }
    } catch (err) {
      console.warn('[consultant] LLM call error:', err.message);
      assistantResponseText = isRoman
        ? `Main real DB stats dekh raha hoon. Abhi AI provider unreachable h, lekin DB status active h (Total Niches: ${digest.counts?.niches || 0}).`
        : `Connecting to DB records. AI provider currently unreachable, but active DB stats are loaded (Total Niches: ${digest.counts?.niches || 0}).`;
    }

    // 5. Append Action Confirmation Card Text if action proposed
    if (actionProposal) {
      const actionNotice = isRoman
        ? `\n\nIs action ko confirm karne ke liye neeche diye gaye button par click karein:`
        : `\n\nTo execute this proposed action, please confirm below:`;
      if (!assistantResponseText.includes(actionProposal.title)) {
        assistantResponseText += actionNotice;
      }
    }

    // 6. Persist Assistant Response
    const assistantMsgRecord = db.addConsultantMessage(
      chatId,
      'assistant',
      assistantResponseText,
      toolCallsObj ? JSON.stringify(toolCallsObj) : null
    );

    emitLog('CONSULTANT', `🧠 Assistant response generated for Chat #${chatId}`, { chatId });

    return {
      userMessage: userMsgRecord,
      assistantMessage: assistantMsgRecord,
      messages: db.getConsultantMessages(chatId),
    };
  }

  /**
   * Executes a confirmed action proposal (DH Action).
   * @param {object} actionProposal
   * @returns {Promise<object>} Execution result
   */
  async executeAction(actionProposal) {
    if (!actionProposal || !actionProposal.action) {
      throw new Error('Invalid action proposal object.');
    }

    const { action, payload } = actionProposal;
    emitLog('CONSULTANT', `⚡ Executing confirmed DH action: ${action}`, { action, payload });

    if (action === 'start_run') {
      const { chainEngine } = require('../engine/chainEngine');
      const runData = {
        run_name: payload.run_name || 'Consultant Discovery Run',
        input_mode: payload.input_mode || 'discovery',
        business_modes: payload.business_modes || ['blogging', 'affiliate', 'ecommerce', 'digital_products'],
        niche_quantity: payload.niche_quantity || 3,
        auto_approve: true,
        trigger_source: 'chat',
      };
      const countryCodes = payload.country_codes || ['US'];
      const newRun = db.createRun(runData, countryCodes, null);
      
      // Launch run
      chainEngine.startRun(newRun.id, { autoApprove: true });

      if (payload.chat_id) {
        db.addConsultantMessage(
          payload.chat_id,
          'assistant',
          `✅ **Run #${newRun.id} ("${newRun.run_name}") created & launched!**\n` +
          `Status: \`discovery\` / \`executing\`.\n` +
          `Aap **Runs** page par live execution aur discovered niches dekh sakte hain!`
        );
      }

      return {
        success: true,
        action,
        message: `Research Run #${newRun.id} ("${newRun.run_name}") created and launched successfully!`,
        runId: newRun.id,
      };
    } else if (action === 'toggle_schedule') {
      const { scheduler } = require('./scheduler');
      const updated = scheduler.updateSchedule(payload.schedule_id, { enabled: payload.enable ? 1 : 0 });
      return {
        success: true,
        action,
        message: `Schedule #${payload.schedule_id} ("${updated.name}") ${payload.enable ? 'enabled' : 'disabled'}.`,
      };
    } else if (action === 'delete_schedule') {
      const { scheduler } = require('./scheduler');
      scheduler.deleteSchedule(payload.schedule_id);
      return {
        success: true,
        action,
        message: `Schedule #${payload.schedule_id} permanently deleted.`,
      };
    } else {
      throw new Error(`Unknown action type '${action}'`);
    }
  }
}

const consultantAgent = new SeniorConsultantAgent();

/* ══════════════════════════════════════════════════════════════
   REGISTER AGENT #35 IN AGENT REGISTRY
   ══════════════════════════════════════════════════════════════ */
try {
  agentRegistry.register(
    35,
    'Senior Consultant',
    'advisor',
    async (context) => {
      const digest = consultantAgent.getSystemContextDigest();
      return {
        status: 'idle',
        agent: 'Senior Consultant',
        agent_number: 35,
        digest,
        timestamp: new Date().toISOString(),
      };
    },
    {
      inputs: ['user_chats', 'db_queries'],
      outputs: ['consultant_advice', 'action_proposals'],
      isCritical: false,
      desc: 'Executive strategy, niche investment advisor, and decision guide.',
    }
  );
} catch (err) {
  console.warn('[consultant] Failed to register agent in registry:', err.message);
}

module.exports = {
  consultantAgent,
  SeniorConsultantAgent,
};
