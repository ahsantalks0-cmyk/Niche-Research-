'use strict';

/**
 * NRD · jarvisGateway.js — Jarvis Gateway Agent (Agent #5) (P1.5)
 * 
 * ROLE:
 * The External API Gateway and Companion App Orchestration bridge.
 * Exposes a lightweight, secure local HTTP server (127.0.0.1 only) allowing external
 * tools, scripts, CLI commands, and companion services to commission and query research.
 * 
 * CORE CONTRACTS:
 * 1. 127.0.0.1 BINDING ONLY — strictly rejects any external/remote connections.
 * 2. AUTHENTICATION — validated against app_settings.jarvis_api_key (X-Jarvis-Key header).
 * 3. RATE LIMITING — 60 requests/minute per client IP.
 * 4. AUDIT TRAIL — every request is recorded in jarvis_requests table & emitted to Live Logs.
 * 5. PORT FAULT TOLERANCE — handles EADDRINUSE gracefully without crashing the Electron app.
 */

const http = require('node:http');
const crypto = require('node:crypto');
const db = require('../db');
const { emitLog } = require('../engine/logBus');

const DEFAULT_PORT = 47821;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB limit

class JarvisGatewayAgent {
  constructor(options = {}) {
    this.server = null;
    this.running = false;
    this.port = typeof options === 'number'
      ? options
      : (typeof options === 'object' && options?.port ? Number(options.port) : DEFAULT_PORT);
    this.customApiKey = typeof options === 'object' && options?.apiKey ? String(options.apiKey).trim() : null;
    this.host = '127.0.0.1';
    this.lastError = null;
    this.portBusy = false;
    this.lastStartedAt = null;

    // Rate limiting map: ip -> { count, windowStart }
    this.rateLimitMap = new Map();
    this.rateLimiter = this.rateLimitMap;
  }

  /**
   * Generates a cryptographically secure API key string.
   * @returns {string}
   */
  generateApiKey() {
    const randomBytes = crypto.randomBytes(24).toString('hex');
    return `sk_jarvis_${randomBytes}`;
  }

  /**
   * Checks if an IP has exceeded the rate limit.
   * @param {string} ip
   * @returns {boolean} True if rate limited
   */
  checkRateLimit(ip) {
    const now = Date.now();
    const entry = this.rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      this.rateLimitMap.set(ip, { count: 1, windowStart: now });
      return false;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return true;
    }

    entry.count += 1;
    return false;
  }

  /**
   * Validates client IP is loopback.
   * @param {string} remoteIp
   * @returns {boolean}
   */
  isLocalIp(remoteIp) {
    if (!remoteIp) return false;
    return (
      remoteIp === '127.0.0.1' ||
      remoteIp === '::1' ||
      remoteIp === '::ffff:127.0.0.1' ||
      remoteIp === 'localhost'
    );
  }

  /**
   * Timing-safe API key comparison.
   * @param {string} incomingKey
   * @param {string} configuredKey
   * @returns {boolean}
   */
  validateApiKey(incomingKey, configuredKey) {
    if (!incomingKey || !configuredKey) return false;
    if (incomingKey.length !== configuredKey.length) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(incomingKey, 'utf8'),
        Buffer.from(configuredKey, 'utf8')
      );
    } catch {
      return incomingKey === configuredKey;
    }
  }

  /**
   * Parses JSON body from incoming request with size cap.
   * @param {http.IncomingMessage} req
   * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
   */
  parseRequestBody(req) {
    return new Promise((resolve) => {
      let bodyStr = '';
      let bytesRead = 0;

      req.on('data', (chunk) => {
        bytesRead += chunk.length;
        if (bytesRead > MAX_BODY_BYTES) {
          resolve({ ok: false, error: 'payload_too_large' });
          req.destroy();
          return;
        }
        bodyStr += chunk;
      });

      req.on('end', () => {
        if (!bodyStr || bodyStr.trim() === '') {
          resolve({ ok: true, data: {} });
          return;
        }
        try {
          const parsed = JSON.parse(bodyStr);
          resolve({ ok: true, data: parsed });
        } catch {
          resolve({ ok: false, error: 'invalid_json' });
        }
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    });
  }

  /**
   * Sends JSON response helper.
   * @param {http.ServerResponse} res
   * @param {number} status
   * @param {object} payload
   */
  sendJson(res, status, payload) {
    const jsonStr = JSON.stringify(payload);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(jsonStr),
      'Cache-Control': 'no-store',
      'X-Jarvis-Agent': 'NRD-Agent-5',
    });
    res.end(jsonStr);
  }

  /**
   * Main HTTP Request Handler for Jarvis Gateway.
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   */
  async handleRequest(req, res) {
    const startTime = Date.now();
    const clientIp = req.socket?.remoteAddress || '127.0.0.1';
    const method = req.method ? req.method.toUpperCase() : 'GET';
    const parsedUrl = new URL(req.url || '/', `http://${this.host}:${this.port}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

    // 1. Enforce local loopback only
    if (!this.isLocalIp(clientIp)) {
      const responseObj = { error: 'forbidden_non_local', message: 'Jarvis Gateway only binds to 127.0.0.1' };
      this.sendJson(res, 403, responseObj);
      this.logAndAudit(method, pathname, 403, false, Date.now() - startTime, clientIp, null, responseObj);
      return;
    }

    // 2. Rate limiting check (60/min)
    if (this.checkRateLimit(clientIp)) {
      const responseObj = { error: 'rate_limited', message: 'Too many requests. Limit is 60 requests per minute.' };
      this.sendJson(res, 429, responseObj);
      this.logAndAudit(method, pathname, 429, false, Date.now() - startTime, clientIp, null, responseObj);
      return;
    }

    // 3. Auth Check: Verify X-Jarvis-Key
    const settings = db.getSettings() || {};
    const configuredKey = (this.customApiKey || settings.jarvis_api_key || '').trim();

    if (!configuredKey) {
      const responseObj = { error: 'jarvis_key_not_configured', message: 'Jarvis API key is not configured in Settings.' };
      this.sendJson(res, 503, responseObj);
      this.logAndAudit(method, pathname, 503, false, Date.now() - startTime, clientIp, null, responseObj);
      emitLog('CHAIN', `🌐 Jarvis: ${method} ${pathname} → 503 (key not configured)`);
      return;
    }

    const incomingKey = (req.headers['x-jarvis-key'] || req.headers['x-api-key'] || req.headers['authorization'] || '')
      .replace(/^Bearer\s+/i, '')
      .trim();

    if (!incomingKey) {
      const responseObj = { error: 'MISSING_API_KEY', message: 'X-Jarvis-Key header is required.' };
      this.sendJson(res, 401, responseObj);
      this.logAndAudit(method, pathname, 401, false, Date.now() - startTime, clientIp, null, responseObj);
      emitLog('CHAIN', `🌐 Jarvis: ${method} ${pathname} → 401 (missing key)`);
      return;
    }

    const isKeyValid = this.validateApiKey(incomingKey, configuredKey);

    if (!isKeyValid) {
      const responseObj = { error: 'INVALID_API_KEY', message: 'Invalid Jarvis API key provided.' };
      this.sendJson(res, 401, responseObj);
      this.logAndAudit(method, pathname, 401, false, Date.now() - startTime, clientIp, null, responseObj);
      emitLog('CHAIN', `🌐 Jarvis: ${method} ${pathname} → 401 (invalid key)`);
      return;
    }

    // 4. Route Dispatcher
    let requestPayload = null;

    try {
      // ───────────────────────────────────────────────────────────
      // GET /v1/ping
      // ───────────────────────────────────────────────────────────
      if (method === 'GET' && (pathname === '/v1/ping' || pathname === '/ping')) {
        const responseObj = {
          ok: true,
          status: 'ok',
          gateway: 'online',
          agent: 'jarvis-gateway',
          version: '1.0.0',
          department: 'niche-research',
          uptime_seconds: Math.round(process.uptime()),
          time: new Date().toISOString(),
        };
        this.sendJson(res, 200, responseObj);
        this.logAndAudit(method, pathname, 200, true, Date.now() - startTime, clientIp, null, responseObj);
        emitLog('CHAIN', `🌐 Jarvis: GET /v1/ping → 200 (health check ok)`);
        return;
      }

      // ───────────────────────────────────────────────────────────
      // POST /v1/research
      // ───────────────────────────────────────────────────────────
      if (method === 'POST' && pathname === '/v1/research') {
        const bodyRes = await this.parseRequestBody(req);
        if (!bodyRes.ok) {
          const responseObj = { error: 'VALIDATION_ERROR', message: bodyRes.error || 'invalid_body' };
          const status = bodyRes.error === 'payload_too_large' ? 413 : 400;
          this.sendJson(res, status, responseObj);
          this.logAndAudit(method, pathname, status, true, Date.now() - startTime, clientIp, null, responseObj);
          return;
        }

        requestPayload = bodyRes.data;
        const validation = this.validateResearchPayload(requestPayload);

        if (!validation.valid) {
          const responseObj = {
            error: 'VALIDATION_ERROR',
            message: 'Research configuration payload failed validation.',
            details: validation.errors,
          };
          this.sendJson(res, 400, responseObj);
          this.logAndAudit(method, pathname, 400, true, Date.now() - startTime, clientIp, requestPayload, responseObj);
          emitLog('CHAIN', `🌐 Jarvis: POST /v1/research → 400 (${validation.errors.join('; ')})`);
          return;
        }

        // Create Research Run
        const createdRun = this.executeCreateResearchRun(validation.cleanPayload);
        const responseObj = {
          success: true,
          run_id: createdRun.id,
          status: createdRun.status,
          run: createdRun,
        };

        this.sendJson(res, 201, responseObj);
        this.logAndAudit(method, pathname, 201, true, Date.now() - startTime, clientIp, requestPayload, responseObj);
        emitLog('CHAIN', `🌐 Jarvis: POST /v1/research → 201 (Created Run #${createdRun.id})`);
        return;
      }

      // ───────────────────────────────────────────────────────────
      // GET /v1/research/:id
      // ───────────────────────────────────────────────────────────
      const matchResearchId = pathname.match(/^\/v1\/research\/(\d+)$/);
      if (method === 'GET' && matchResearchId) {
        const runId = parseInt(matchResearchId[1], 10);
        const run = db.getRun(runId);

        if (!run) {
          const responseObj = { error: 'run_not_found', run_id: runId };
          this.sendJson(res, 404, responseObj);
          this.logAndAudit(method, pathname, 404, true, Date.now() - startTime, clientIp, null, responseObj);
          return;
        }

        const agentsSnapshot = Array.isArray(run.agents)
          ? run.agents.map((a) => ({
              number: a.agent_number,
              name: a.agent_name,
              layer: a.layer,
              status: a.status,
              summary: a.output_summary || null,
              retry_count: a.retry_count || 0,
            }))
          : [];

        const responseObj = {
          ok: true,
          id: run.id,
          run_id: run.id,
          run_name: run.run_name,
          status: run.status,
          current_phase: run.current_phase || run.status,
          run: {
            id: run.id,
            run_name: run.run_name,
            status: run.status,
            current_phase: run.current_phase || run.status,
            created_at: run.created_at,
            started_at: run.started_at || null,
            completed_at: run.completed_at || null,
          },
          agents: agentsSnapshot,
          created_at: run.created_at,
          started_at: run.started_at || null,
          completed_at: run.completed_at || null,
        };

        this.sendJson(res, 200, responseObj);
        this.logAndAudit(method, pathname, 200, true, Date.now() - startTime, clientIp, null, responseObj);
        return;
      }

      // ───────────────────────────────────────────────────────────
      // GET /v1/research/:id/results
      // ───────────────────────────────────────────────────────────
      const matchResearchResults = pathname.match(/^\/v1\/research\/(\d+)\/results$/);
      if (method === 'GET' && matchResearchResults) {
        const runId = parseInt(matchResearchResults[1], 10);
        const run = db.getRun(runId);

        if (!run) {
          const responseObj = { error: 'run_not_found', run_id: runId };
          this.sendJson(res, 404, responseObj);
          this.logAndAudit(method, pathname, 404, true, Date.now() - startTime, clientIp, null, responseObj);
          return;
        }

        if (run.status !== 'completed') {
          const responseObj = {
            error: 'run_not_completed',
            run_id: run.id,
            status: run.status,
            message: `Run #${run.id} is currently in '${run.status}' state.`,
          };
          this.sendJson(res, 409, responseObj);
          this.logAndAudit(method, pathname, 409, true, Date.now() - startTime, clientIp, null, responseObj);
          return;
        }

        const niches = db.getNichesByRun ? db.getNichesByRun(runId) : [];
        const responseObj = {
          run_id: run.id,
          status: run.status,
          niches,
          scores: [],
          note: 'Phase 3-5 deep research agents will enrich scores and monetization packages in upcoming stages.',
        };

        this.sendJson(res, 200, responseObj);
        this.logAndAudit(method, pathname, 200, true, Date.now() - startTime, clientIp, null, responseObj);
        return;
      }

      // ───────────────────────────────────────────────────────────
      // GET /v1/schedules
      // ───────────────────────────────────────────────────────────
      if (method === 'GET' && pathname === '/v1/schedules') {
        const schedules = db.getSchedules ? db.getSchedules() : [];
        const responseObj = {
          ok: true,
          count: schedules.length,
          schedules,
        };
        this.sendJson(res, 200, responseObj);
        this.logAndAudit(method, pathname, 200, true, Date.now() - startTime, clientIp, null, responseObj);
        return;
      }

      // Unknown route -> 404
      const notFoundObj = { error: 'not_found', path: pathname, method };
      this.sendJson(res, 404, notFoundObj);
      this.logAndAudit(method, pathname, 404, true, Date.now() - startTime, clientIp, null, notFoundObj);
    } catch (err) {
      const errorObj = { error: 'internal_server_error', message: err.message };
      this.sendJson(res, 500, errorObj);
      this.logAndAudit(method, pathname, 500, true, Date.now() - startTime, clientIp, requestPayload, errorObj);
      emitLog('CHAIN', `🌐 Jarvis: ${method} ${pathname} → 500 (${err.message})`);
    }
  }

  /**
   * Validates incoming /v1/research POST payload.
   * @param {object} payload
   * @returns {{ valid: boolean, errors: string[], cleanPayload?: object }}
   */
  validateResearchPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, errors: ['Payload must be a valid JSON object.'] };
    }

    const errors = [];
    const validModes = new Set(['discovery', 'own_niche', 'own_domain']);
    const validBizModes = new Set(['blogging', 'affiliate', 'ecommerce', 'digital_products']);

    const inputMode = payload.input_mode || 'discovery';
    if (!validModes.has(inputMode)) {
      errors.push(`Invalid input_mode '${inputMode}'. Must be one of: discovery, own_niche, own_domain.`);
    }

    let businessModes = payload.business_modes;
    if (typeof businessModes === 'string') {
      businessModes = [businessModes];
    }
    if (!Array.isArray(businessModes) || businessModes.length === 0) {
      errors.push('business_modes must be a non-empty array of strings.');
    } else {
      const invalidBiz = businessModes.filter((m) => !validBizModes.has(m));
      if (invalidBiz.length > 0) {
        errors.push(`Invalid business_modes: ${invalidBiz.join(', ')}. Must be from: blogging, affiliate, ecommerce, digital_products.`);
      }
    }

    const nicheQuantity = payload.niche_quantity !== undefined ? parseInt(payload.niche_quantity, 10) : 1;
    if (isNaN(nicheQuantity) || nicheQuantity < 1 || nicheQuantity > 10) {
      errors.push('niche_quantity must be an integer between 1 and 10.');
    }

    let ownNicheName = payload.own_niche_name || payload.niche_name || payload.niche_text || null;
    if (inputMode === 'own_niche') {
      if (!ownNicheName || typeof ownNicheName !== 'string' || ownNicheName.trim() === '') {
        errors.push("own_niche_name is required when input_mode is 'own_niche'.");
      } else {
        ownNicheName = ownNicheName.trim();
      }
    }

    let domain = payload.domain || payload.domain_text || null;
    if (inputMode === 'own_domain') {
      if (!domain || typeof domain !== 'string' || domain.trim() === '') {
        errors.push("domain is required when input_mode is 'own_domain'.");
      } else {
        domain = domain.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
          errors.push(`Invalid domain format '${domain}'. Expected name.tld.`);
        }
      }
    }

    let countryCodes = payload.country_codes || payload.countries || ['US'];
    if (typeof countryCodes === 'string') {
      countryCodes = [countryCodes];
    }
    if (!Array.isArray(countryCodes) || countryCodes.length === 0) {
      countryCodes = ['US'];
    }

    const autoApprove = payload.auto_approve !== undefined ? Boolean(payload.auto_approve) : true;
    const runName = payload.run_name && typeof payload.run_name === 'string' && payload.run_name.trim() !== ''
      ? payload.run_name.trim()
      : `Jarvis Commission ${new Date().toLocaleTimeString()}`;

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      errors: [],
      cleanPayload: {
        run_name: runName,
        input_mode: inputMode,
        business_modes: businessModes,
        niche_quantity: nicheQuantity,
        own_niche_name: ownNicheName,
        domain: domain,
        country_codes: countryCodes,
        auto_approve: autoApprove,
        competition_level: payload.competition_level || 'medium',
      },
    };
  }

  /**
   * Creates a research run from validated payload and triggers chain execution if auto_approved.
   * @param {object} clean
   * @returns {object}
   */
  executeCreateResearchRun(clean) {
    const runPayload = {
      run_name: clean.run_name,
      input_mode: clean.input_mode,
      business_modes: clean.business_modes,
      niche_quantity: clean.niche_quantity,
      own_niche_name: clean.own_niche_name,
      domain: clean.domain,
      competition_level: clean.competition_level,
      status: 'pending',
      approval_gate_passed: clean.auto_approve ? 1 : 0,
      auto_approve: clean.auto_approve ? 1 : 0,
      trigger_source: 'jarvis',
    };

    const run = db.createRun(runPayload, clean.country_codes, {});

    // If auto_approved, kickoff chain engine
    if (clean.auto_approve) {
      try {
        const { chainEngine } = require('../engine/chainEngine');
        chainEngine.startRun(run.id, { autoApprove: true }).catch((err) => {
          console.warn(`[jarvis] Chain engine execution error on run #${run.id}:`, err.message);
        });
      } catch (err) {
        console.warn(`[jarvis] Failed to invoke chain engine: ${err.message}`);
      }
    }

    return run;
  }

  /**
   * Logs request to DB and telemetry.
   */
  logAndAudit(method, path, statusCode, keyValid, durationMs, clientIp, requestPayload, responsePayload) {
    try {
      db.logJarvisRequest({
        method,
        path,
        statusCode,
        keyValid,
        durationMs,
        clientIp,
        requestPayload,
        responsePayload,
      });
    } catch (err) {
      console.warn('[jarvis] Failed to write jarvis_requests log:', err.message);
    }
  }

  /**
   * Starts the local HTTP server.
   * @param {number | { port?: number, apiKey?: string }} [portOverride]
   * @returns {Promise<{ success: boolean, port: number, error?: string }>}
   */
  start(portOverride) {
    return new Promise(async (resolve) => {
      const settings = db.getSettings() || {};
      let targetPort = this.port;

      if (typeof portOverride === 'number') {
        targetPort = portOverride;
      } else if (typeof portOverride === 'object' && portOverride !== null) {
        if (portOverride.port) targetPort = Number(portOverride.port);
        if (portOverride.apiKey) this.customApiKey = String(portOverride.apiKey).trim();
      } else if (!targetPort || targetPort === DEFAULT_PORT) {
        targetPort = settings.jarvis_port || DEFAULT_PORT;
      }

      if (this.running && this.server) {
        if (targetPort === this.port) {
          resolve({ success: true, port: this.port, running: true });
          return;
        }
        await this.stop();
      }

      this.port = targetPort;
      this.lastError = null;
      this.portBusy = false;

      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        this.running = false;
        if (err.code === 'EADDRINUSE') {
          this.portBusy = true;
          this.lastError = `Port ${this.port} is already in use (EADDRINUSE).`;
          emitLog('CHAIN', `⚠️ Jarvis Gateway: Port ${this.port} is busy. Will not crash.`);
        } else {
          this.lastError = err.message;
          emitLog('CHAIN', `❌ Jarvis Gateway Server Error: ${err.message}`);
        }
        resolve({ success: false, port: this.port, error: this.lastError });
      });

      try {
        this.server.listen(this.port, this.host, () => {
          this.running = true;
          this.lastStartedAt = new Date().toISOString();
          emitLog('CHAIN', `🚀 Jarvis Gateway (Agent #5) listening on http://${this.host}:${this.port}`);
          resolve({ success: true, port: this.port, running: true });
        });
      } catch (err) {
        this.running = false;
        this.lastError = err.message;
        resolve({ success: false, port: this.port, error: err.message });
      }
    });
  }

  /**
   * Stops the HTTP server.
   * @returns {Promise<{ success: boolean }>}
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.server) {
        this.running = false;
        resolve({ success: true });
        return;
      }

      this.server.close(() => {
        this.running = false;
        this.server = null;
        emitLog('CHAIN', '🛑 Jarvis Gateway (Agent #5) stopped.');
        resolve({ success: true });
      });
    });
  }

  /**
   * Returns live status snapshot.
   * @returns {object}
   */
  getStatus() {
    const settings = db.getSettings() || {};
    return {
      running: this.running,
      enabled: Boolean(settings.jarvis_enabled),
      host: this.host,
      port: this.port || settings.jarvis_port || DEFAULT_PORT,
      hasApiKey: Boolean(settings.jarvis_api_key && settings.jarvis_api_key.trim() !== ''),
      error: this.lastError,
      portBusy: this.portBusy,
      lastStartedAt: this.lastStartedAt,
    };
  }
}

const jarvisGateway = new JarvisGatewayAgent();

/* ══════════════════════════════════════════════════════════════
   REGISTER AGENT #5 IN AGENT REGISTRY
   ══════════════════════════════════════════════════════════════ */
try {
  const agentRegistry = require('../engine/agentRegistry');
  agentRegistry.register(
    5,
    'Jarvis Gateway',
    'control',
    async (_context) => {
      const status = jarvisGateway.getStatus();
      return {
        status: status.running ? 'success' : 'idle',
        agent: 'Jarvis Gateway',
        agent_number: 5,
        gateway_status: status,
        timestamp: new Date().toISOString(),
      };
    },
    {
      inputs: ['http_request', 'x_jarvis_key'],
      outputs: ['commission_runs', 'status_snapshots', 'results_payload'],
      isCritical: false,
      desc: 'External CLI, API & webhook trigger intake coordinator.',
    }
  );
} catch (err) {
  console.warn('[jarvis] Failed to register agent in registry:', err.message);
}

try {
  const qualitySupervisor = require('./qualitySupervisor');
  qualitySupervisor.registerQualityRules(5, {
    outputType: 'config',
    requiredFields: ['gateway_status', 'agent_number'],
  });
} catch (err) {
  console.warn('[jarvis] Failed to register quality rules:', err.message);
}

module.exports = {
  jarvisGateway,
  JarvisGatewayAgent,
};
