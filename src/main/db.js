'use strict';

/**
 * NRD · db.js — Main Process SQLite Database Engine.
 * Powered by better-sqlite3 with WAL mode, foreign keys, and versioned migrations.
 * DB file lives strictly in Electron's userData directory: app.getPath('userData')/niche_research.db
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const migrationV1 = require('./migrations/v1');
const migrationV2 = require('./migrations/v2');
const migrationV3 = require('./migrations/v3');
const migrationV4 = require('./migrations/v4');
const migrationV5 = require('./migrations/v5');
const migrationV6 = require('./migrations/v6');
const migrationV7 = require('./migrations/v7');
const migrationV8 = require('./migrations/v8');
const migrationV9 = require('./migrations/v9');

const MIGRATIONS = [
  migrationV1,
  migrationV2,
  migrationV3,
  migrationV4,
  migrationV5,
  migrationV6,
  migrationV7,
  migrationV8,
  migrationV9,
];

let _db = null;

/**
 * Resolves the path to the SQLite database file in Electron's userData directory.
 * Never inside the project repository.
 * @returns {string} Absolute file path to niche_research.db
 */
function getDbPath() {
  let userDataDir = null;

  try {
    if (process.versions && process.versions.electron) {
      const { app } = require('electron');
      if (app && typeof app.getPath === 'function') {
        userDataDir = app.getPath('userData');
      }
    }
  } catch {
    // Running outside Electron (e.g. unit tests, dev server)
  }

  if (!userDataDir) {
    if (process.platform === 'win32') {
      userDataDir = path.join(process.env.APPDATA || process.env.USERPROFILE || 'C:\\', 'niche-research-department');
    } else if (process.platform === 'darwin') {
      userDataDir = path.join(process.env.HOME || '/tmp', 'Library', 'Application Support', 'niche-research-department');
    } else {
      userDataDir = path.join(
        process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || '/tmp', '.config'),
        'niche-research-department'
      );
    }
  }

  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  return path.join(userDataDir, 'niche_research.db');
}

/**
 * Initializes and returns the better-sqlite3 database singleton.
 * Enables WAL mode, foreign key enforcement, and applies pending migrations.
 * @param {string} [customPath] Optional custom DB path (e.g. for testing)
 * @returns {import('better-sqlite3').Database}
 */
function getDb(customPath) {
  if (_db) return _db;

  const dbPath = customPath || getDbPath();
  _db = new Database(dbPath, { timeout: 10000 });

  // 1. Enforce performance & integrity pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');

  // 2. Run migrations
  runMigrations(_db);

  return _db;
}

/**
 * Executes version-based migrations sequentially.
 * Tracks applied migrations in the schema_migrations table.
 * @param {import('better-sqlite3').Database} [database]
 */
function runMigrations(database) {
  const db = database || getDb();
  // Ensure the migration tracker table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedRows = db.prepare('SELECT version FROM schema_migrations ORDER BY version ASC').all();
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const mig of MIGRATIONS) {
    if (!appliedVersions.has(mig.version)) {
      console.log(`[db] Applying migration v${mig.version}: ${mig.name}…`);
      mig.up(db);
      db.prepare(`
        INSERT INTO schema_migrations (version, name) VALUES (?, ?)
      `).run(mig.version, mig.name);
      console.log(`[db] Migration v${mig.version} successfully applied.`);
    }
  }
}

/**
 * Closes the active database connection if open.
 */
function closeDb() {
  if (_db) {
    try {
      _db.close();
    } catch {
      // ignore
    }
    _db = null;
  }
}

/* ══════════════════════════════════════════════════════════════
   GENERIC CRUD HELPERS
   ══════════════════════════════════════════════════════════════ */

/**
 * Inserts a single record into a table.
 * Automatically injects created_at and updated_at timestamps if not provided.
 * @param {string} table
 * @param {Record<string, any>} data
 * @returns {{ id: number | bigint, changes: number }}
 */
function insert(table, data) {
  const db = getDb();
  const payload = { ...data };

  // Sanitize object/array fields to JSON strings if passed as JS objects
  for (const [k, v] of Object.entries(payload)) {
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
      payload[k] = JSON.stringify(v);
    }
  }

  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new Error(`Cannot insert empty payload into ${table}`);
  }

  const cols = keys.join(', ');
  const placeholders = keys.map((k) => `@${k}`).join(', ');
  const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;

  const stmt = db.prepare(sql);
  const info = stmt.run(payload);
  return { id: info.lastInsertRowid, changes: info.changes };
}

/**
 * Updates records matching a where clause or primary key ID.
 * Automatically refreshes updated_at timestamp.
 * @param {string} table
 * @param {number | Record<string, any>} idOrWhere
 * @param {Record<string, any>} data
 * @returns {{ changes: number }}
 */
function update(table, idOrWhere, data) {
  const db = getDb();
  const payload = { ...data, updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) };

  // Sanitize object/array fields
  for (const [k, v] of Object.entries(payload)) {
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
      payload[k] = JSON.stringify(v);
    }
  }

  const setKeys = Object.keys(payload);
  if (setKeys.length === 0) return { changes: 0 };

  const setClauses = setKeys.map((k) => `${k} = @set_${k}`).join(', ');
  const setParams = {};
  for (const k of setKeys) {
    setParams[`set_${k}`] = payload[k];
  }

  let whereClause = '';
  const whereParams = {};

  if (typeof idOrWhere === 'number' || typeof idOrWhere === 'bigint') {
    whereClause = 'id = @where_id';
    whereParams.where_id = idOrWhere;
  } else if (idOrWhere && typeof idOrWhere === 'object') {
    const whereKeys = Object.keys(idOrWhere);
    if (whereKeys.length === 0) throw new Error('Where clause cannot be empty in update');
    whereClause = whereKeys.map((k) => `${k} = @where_${k}`).join(' AND ');
    for (const k of whereKeys) {
      whereParams[`where_${k}`] = idOrWhere[k];
    }
  } else {
    throw new Error('Invalid idOrWhere condition');
  }

  const sql = `UPDATE ${table} SET ${setClauses} WHERE ${whereClause}`;
  const stmt = db.prepare(sql);
  const info = stmt.run({ ...setParams, ...whereParams });
  return { changes: info.changes };
}

/**
 * Finds all records in a table matching optional criteria.
 * @param {string} table
 * @param {Record<string, any>} [where]
 * @param {{ limit?: number, offset?: number, orderBy?: string }} [options]
 * @returns {Array<Record<string, any>>}
 */
function findBy(table, where = {}, options = {}) {
  const db = getDb();
  const whereKeys = Object.keys(where);
  let sql = `SELECT * FROM ${table}`;
  const params = {};

  if (whereKeys.length > 0) {
    const conditions = whereKeys.map((k) => {
      if (where[k] === null) return `${k} IS NULL`;
      params[k] = where[k];
      return `${k} = @${k}`;
    });
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  if (options.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`;
  } else {
    sql += ' ORDER BY id ASC';
  }

  if (typeof options.limit === 'number') {
    sql += ` LIMIT ${options.limit}`;
  }
  if (typeof options.offset === 'number') {
    sql += ` OFFSET ${options.offset}`;
  }

  return db.prepare(sql).all(params);
}

/**
 * Finds a single record matching criteria.
 * @param {string} table
 * @param {Record<string, any>} where
 * @returns {Record<string, any> | null}
 */
function findOne(table, where = {}) {
  const rows = findBy(table, where, { limit: 1 });
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Deletes records matching criteria.
 * @param {string} table
 * @param {Record<string, any>} where
 * @returns {{ changes: number }}
 */
function deleteBy(table, where = {}) {
  const db = getDb();
  const whereKeys = Object.keys(where);
  if (whereKeys.length === 0) {
    throw new Error('deleteBy requires where conditions to prevent accidental truncations');
  }

  const params = {};
  const conditions = whereKeys.map((k) => {
    params[k] = where[k];
    return `${k} = @${k}`;
  });

  const sql = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')}`;
  const info = db.prepare(sql).run(params);
  return { changes: info.changes };
}

/**
 * Counts rows matching criteria.
 * @param {string} table
 * @param {Record<string, any>} [where]
 * @returns {number}
 */
function count(table, where = {}) {
  const db = getDb();
  const whereKeys = Object.keys(where);
  let sql = `SELECT COUNT(*) as cnt FROM ${table}`;
  const params = {};

  if (whereKeys.length > 0) {
    const conditions = whereKeys.map((k) => {
      params[k] = where[k];
      return `${k} = @${k}`;
    });
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  const row = db.prepare(sql).get(params);
  return row ? row.cnt : 0;
}

/* ══════════════════════════════════════════════════════════════
   HIGH-LEVEL / DOMAIN HELPERS FOR IPC AND RENDERER
   ══════════════════════════════════════════════════════════════ */

/**
 * Retrieves the global application settings from app_settings table.
 * @returns {Record<string, any>}
 */
function getSettings() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
  if (!row) {
    db.prepare(`
      INSERT INTO app_settings (id, theme, language, auto_approve, schema_version)
      VALUES (1, 'dark', 'english', 0, 1)
    `).run();
    return getSettings();
  }
  return {
    theme: row.theme,
    language: row.language,
    autoApprove: !!row.auto_approve,
    auto_approve: !!row.auto_approve,
    geminiApiKey: row.gemini_api_key || '',
    gemini_api_key: row.gemini_api_key || '',
    openaiApiKey: row.openai_api_key || '',
    openai_api_key: row.openai_api_key || '',
    anthropicApiKey: row.anthropic_api_key || '',
    anthropic_api_key: row.anthropic_api_key || '',
    groqApiKey: row.groq_api_key || '',
    groq_api_key: row.groq_api_key || '',
    jarvisApiKey: row.jarvis_api_key || '',
    jarvis_api_key: row.jarvis_api_key || '',
    whiteLabelBrand: row.white_label_brand || '',
    white_label_brand: row.white_label_brand || '',
    lastUpdateCheck: row.last_update_check || null,
    last_update_check: row.last_update_check || null,
    schemaVersion: row.schema_version,
    schema_version: row.schema_version,
    browserSlots: row.browser_slots !== undefined ? Number(row.browser_slots) : 3,
    browser_slots: row.browser_slots !== undefined ? Number(row.browser_slots) : 3,
    cacheTtlHours: row.cache_ttl_hours !== undefined ? Number(row.cache_ttl_hours) : 24,
    cache_ttl_hours: row.cache_ttl_hours !== undefined ? Number(row.cache_ttl_hours) : 24,
    rateLimitGooglePerMin: row.rate_limit_google_per_min !== undefined ? Number(row.rate_limit_google_per_min) : 8,
    rate_limit_google_per_min: row.rate_limit_google_per_min !== undefined ? Number(row.rate_limit_google_per_min) : 8,
    maxRetries: row.max_retries !== undefined ? Number(row.max_retries) : 3,
    max_retries: row.max_retries !== undefined ? Number(row.max_retries) : 3,
    aiProvider: row.ai_provider || 'gemini',
    ai_provider: row.ai_provider || 'gemini',
    aiModel: row.ai_model || 'gemini-2.5-flash',
    ai_model: row.ai_model || 'gemini-2.5-flash',
    aiModelInvalid: row.ai_model_invalid !== undefined ? Number(row.ai_model_invalid) : 0,
    ai_model_invalid: row.ai_model_invalid !== undefined ? Number(row.ai_model_invalid) : 0,
    aiModelInvalidReason: row.ai_model_invalid_reason || '',
    ai_model_invalid_reason: row.ai_model_invalid_reason || '',
  };
}

/**
 * Updates application settings in the database.
 * @param {Record<string, any>} patch
 * @returns {Record<string, any>} Updated settings
 */
function saveSettings(patch = {}) {
  const db = getDb();
  const allowed = {
    theme: 'theme',
    language: 'language',
    autoApprove: 'auto_approve',
    auto_approve: 'auto_approve',
    geminiApiKey: 'gemini_api_key',
    gemini_api_key: 'gemini_api_key',
    openaiApiKey: 'openai_api_key',
    openai_api_key: 'openai_api_key',
    anthropicApiKey: 'anthropic_api_key',
    anthropic_api_key: 'anthropic_api_key',
    groqApiKey: 'groq_api_key',
    groq_api_key: 'groq_api_key',
    jarvisApiKey: 'jarvis_api_key',
    jarvis_api_key: 'jarvis_api_key',
    whiteLabelBrand: 'white_label_brand',
    white_label_brand: 'white_label_brand',
    lastUpdateCheck: 'last_update_check',
    last_update_check: 'last_update_check',
    browserSlots: 'browser_slots',
    browser_slots: 'browser_slots',
    cacheTtlHours: 'cache_ttl_hours',
    cache_ttl_hours: 'cache_ttl_hours',
    rateLimitGooglePerMin: 'rate_limit_google_per_min',
    rate_limit_google_per_min: 'rate_limit_google_per_min',
    maxRetries: 'max_retries',
    max_retries: 'max_retries',
    aiProvider: 'ai_provider',
    ai_provider: 'ai_provider',
    aiModel: 'ai_model',
    ai_model: 'ai_model',
    aiModelInvalid: 'ai_model_invalid',
    ai_model_invalid: 'ai_model_invalid',
    aiModelInvalidReason: 'ai_model_invalid_reason',
    ai_model_invalid_reason: 'ai_model_invalid_reason',
    jarvisEnabled: 'jarvis_enabled',
    jarvis_enabled: 'jarvis_enabled',
    jarvisPort: 'jarvis_port',
    jarvis_port: 'jarvis_port',
  };

  const fields = {};
  for (const [patchKey, colName] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(patch, patchKey)) {
      let val = patch[patchKey];
      if (patchKey === 'autoApprove') val = val ? 1 : 0;
      fields[colName] = val;
    }
  }

  if (Object.keys(fields).length > 0) {
    fields.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const sets = Object.keys(fields).map((c) => `${c} = @${c}`).join(', ');
    db.prepare(`UPDATE app_settings SET ${sets} WHERE id = 1`).run(fields);
  }

  return getSettings();
}

/**
 * Returns the list of countries.
 * @param {boolean} [activeOnly=false]
 * @returns {Array<Record<string, any>>}
 */
function getCountries(activeOnly = false) {
  const db = getDb();
  const sql = activeOnly
    ? 'SELECT * FROM countries WHERE is_active = 1 ORDER BY potential_score DESC'
    : 'SELECT * FROM countries ORDER BY potential_score DESC';
  const rows = db.prepare(sql).all();
  return rows.map((r) => ({
    ...r,
    local_platforms: r.local_platforms ? JSON.parse(r.local_platforms) : [],
  }));
}

/**
 * Creates a complete research run along with run_countries and initial run_criteria.
 * Transactionally initializes agent_status rows for all 35 agents in the run.
 * @param {Record<string, any>} runData
 * @param {Array<string>} [countryCodes=[]]
 * @param {Record<string, any>} [criteriaBrief={}]
 * @returns {Record<string, any>} The created run row
 */
function createRun(runData, countryCodes = [], criteriaBrief = {}) {
  const db = getDb();

  const AGENT_LAYERS = [
    { num: 1, name: 'Department Head Agent', layer: 'control' },
    { num: 2, name: 'Criteria Parser Agent', layer: 'control' },
    { num: 3, name: 'Quality Supervisor', layer: 'qa_reporting' },
    { num: 4, name: 'Scheduler Agent', layer: 'control' },
    { num: 5, name: 'Jarvis Gateway', layer: 'control' },
    { num: 6, name: 'Niche Discovery', layer: 'discovery' },
    { num: 7, name: 'Trend & Demand Signal', layer: 'discovery' },
    { num: 8, name: 'Quick Competition Screener', layer: 'discovery' },
    { num: 9, name: 'Duplicate & History Check', layer: 'discovery' },
    { num: 10, name: 'Country Potential Intelligence', layer: 'discovery' },
    { num: 11, name: 'Keyword Research', layer: 'deep_research' },
    { num: 12, name: 'SERP Analysis', layer: 'deep_research' },
    { num: 13, name: 'Competitor Deep-Dive', layer: 'deep_research' },
    { num: 14, name: 'Content Gap Analysis', layer: 'deep_research' },
    { num: 15, name: 'Unmet Search Intent', layer: 'deep_research' },
    { num: 16, name: 'Social Media Competition', layer: 'deep_research' },
    { num: 17, name: 'Paid Ads Competition', layer: 'deep_research' },
    { num: 18, name: 'Monetization & Digital Product Research', layer: 'deep_research' },
    { num: 19, name: 'E-commerce Product Research', layer: 'deep_research' },
    { num: 20, name: 'Digital Product List & Launch Sequence', layer: 'deep_research' },
    { num: 21, name: 'E-commerce Product List & Launch Sequence', layer: 'deep_research' },
    { num: 22, name: 'Affiliate Program Research', layer: 'deep_research' },
    { num: 23, name: 'Ad Revenue & RPM', layer: 'deep_research' },
    { num: 24, name: 'Audience & Persona Research', layer: 'deep_research' },
    { num: 25, name: 'Country/Geo Localization', layer: 'deep_research' },
    { num: 26, name: 'Domain & Brand Availability', layer: 'deep_research' },
    { num: 27, name: 'Country Benchmarking', layer: 'intelligence' },
    { num: 28, name: 'Opportunity Scoring', layer: 'intelligence' },
    { num: 29, name: 'Final Verdict', layer: 'intelligence' },
    { num: 30, name: 'Risk & Compliance', layer: 'intelligence' },
    { num: 31, name: 'Quality Supervisor (Audit)', layer: 'qa_reporting' },
    { num: 32, name: 'QA & Validation', layer: 'qa_reporting' },
    { num: 33, name: 'Report Specialist', layer: 'qa_reporting' },
    { num: 34, name: 'SEO Department Handoff', layer: 'qa_reporting' },
    { num: 35, name: 'Re-Research Manager', layer: 'qa_reporting' },
  ];

  const createTx = db.transaction(() => {
    // 1. Insert research_runs row
    const runPayload = {
      run_name: runData.run_name || `Run #${Date.now().toString().slice(-4)}`,
      input_mode: runData.input_mode || 'discovery',
      business_modes: JSON.stringify(runData.business_modes || ['blogging']),
      niche_quantity: runData.niche_quantity || 1,
      own_niche_name: runData.own_niche_name || null,
      domain: runData.domain || null,
      competition_level: runData.competition_level || 'medium',
      status: runData.status || 'pending',
      approval_gate_passed: runData.approval_gate_passed ? 1 : 0,
      auto_approve: runData.auto_approve ? 1 : 0,
      trigger_source: runData.trigger_source || 'ui',
      schedule_id: runData.schedule_id || null,
    };

    const runInfo = insert('research_runs', runPayload);
    const runId = runInfo.id;

    // 2. Insert run_countries
    const insertCountryStmt = db.prepare(`
      INSERT INTO run_countries (run_id, country_code, country_name, selection_type, potential_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const code of countryCodes) {
      const country = db.prepare('SELECT country_name, potential_score FROM countries WHERE country_code = ?').get(code);
      const name = country ? country.country_name : code;
      const score = country ? country.potential_score : 50.0;
      insertCountryStmt.run(runId, code, name, 'user_selected', score);
    }

    // 3. Initialize agent_status for all 35 agents
    const insertAgentStmt = db.prepare(`
      INSERT INTO agent_status (run_id, agent_number, agent_name, layer, status)
      VALUES (?, ?, ?, ?, 'idle')
    `);

    for (const a of AGENT_LAYERS) {
      insertAgentStmt.run(runId, a.num, a.name, a.layer);
    }

    return runId;
  });

  const createdRunId = createTx();

  // Automatically trigger Criteria Parser (Agent #2)
  try {
    const { parseRun } = require('./agents/criteriaParser');
    parseRun(createdRunId);
  } catch (err) {
    console.warn(`[db] Auto-parse for run #${createdRunId} encountered: ${err.message}`);
  }

  return getRun(createdRunId);
}

/**
 * Retrieves a full research run by ID including its countries and agent status.
 * @param {number} runId
 * @returns {Record<string, any> | null}
 */
function getRun(runId) {
  const db = getDb();
  const run = db.prepare('SELECT * FROM research_runs WHERE id = ?').get(runId);
  if (!run) return null;

  const countries = db.prepare('SELECT * FROM run_countries WHERE run_id = ?').all(runId);
  const criteria = db.prepare('SELECT * FROM run_criteria WHERE run_id = ?').get(runId);
  const agents = db.prepare('SELECT * FROM agent_status WHERE run_id = ? ORDER BY agent_number ASC').all(runId);

  let parsedBrief = null;
  let rawInput = null;

  if (criteria) {
    try {
      parsedBrief = typeof criteria.parsed_brief === 'string' ? JSON.parse(criteria.parsed_brief) : criteria.parsed_brief;
    } catch {
      parsedBrief = null;
    }
    try {
      rawInput = typeof criteria.raw_input === 'string' ? JSON.parse(criteria.raw_input) : criteria.raw_input;
    } catch {
      rawInput = null;
    }
  }

  return {
    ...run,
    business_modes: run.business_modes ? JSON.parse(run.business_modes) : [],
    dh_execution_plan: run.dh_execution_plan ? JSON.parse(run.dh_execution_plan) : null,
    chain_state: run.chain_state ? JSON.parse(run.chain_state) : null,
    countries,
    criteria: criteria ? { ...criteria, parsed_brief: parsedBrief, raw_input: rawInput } : null,
    agents,
  };
}

/**
 * Retrieves a list of research runs with country counts, status, and parsed business modes.
 * @param {{ limit?: number, offset?: number }} [options={}]
 * @returns {Array<Record<string, any>>}
 */
function getRuns(options = {}) {
  const db = getDb();
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  const runs = db.prepare(`
    SELECT r.*, s.name AS schedule_name 
    FROM research_runs r
    LEFT JOIN schedules s ON r.schedule_id = s.id
    ORDER BY r.id DESC 
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  return runs.map((run) => {
    let businessModes = [];
    try {
      businessModes = JSON.parse(run.business_modes || '[]');
    } catch {
      businessModes = [];
    }
    const countries = db.prepare(
      'SELECT country_code, country_name, selection_type, potential_score FROM run_countries WHERE run_id = ? ORDER BY id ASC'
    ).all(run.id);

    const criteria = db.prepare('SELECT parser_version, parsed_brief FROM run_criteria WHERE run_id = ?').get(run.id);
    let hasBrief = false;
    if (criteria && criteria.parsed_brief) {
      try {
        const b = JSON.parse(criteria.parsed_brief);
        hasBrief = b && Object.keys(b).length > 0;
      } catch {
        hasBrief = false;
      }
    }

    return {
      ...run,
      business_modes: businessModes,
      countries,
      criteria_version: criteria ? criteria.parser_version : null,
      has_brief: hasBrief,
    };
  });
}

/**
 * Updates an agent's status during a run.
 * @param {number} runId
 * @param {number} agentNumber
 * @param {Record<string, any>} statusUpdate
 */
function updateAgentStatus(runId, agentNumber, statusUpdate = {}) {
  const db = getDb();
  const allowed = ['status', 'started_at', 'finished_at', 'retry_count', 'last_error', 'output_summary', 'input_received', 'output_payload'];
  const patch = {};

  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(statusUpdate, k)) {
      let val = statusUpdate[k];
      if (val !== null && typeof val === 'object') val = JSON.stringify(val);
      patch[k] = val;
    }
  }

  patch.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

  const sets = Object.keys(patch).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE agent_status SET ${sets} WHERE run_id = @run_id AND agent_number = @agent_number`).run({
    ...patch,
    run_id: runId,
    agent_number: agentNumber,
  });

  return db.prepare('SELECT * FROM agent_status WHERE run_id = ? AND agent_number = ?').get(runId, agentNumber);
}

/**
 * Returns niches discovered during a run.
 * @param {number} runId
 * @returns {Array<Record<string, any>>}
 */
function getNichesByRun(runId) {
  const db = getDb();
  const niches = db.prepare('SELECT * FROM niches WHERE run_id = ? ORDER BY id ASC').all(runId);
  return niches.map((n) => ({
    ...n,
    mode_fit: n.mode_fit ? JSON.parse(n.mode_fit) : {},
    peak_months: n.peak_months ? JSON.parse(n.peak_months) : [],
  }));
}

/**
 * Returns real KPI counts from the database for the dashboard.
 * @returns {{ runs: number, niches: number, reports: number, countries: number }}
 */
function getCounts() {
  const db = getDb();
  const runsCount = count('research_runs');
  const nichesCount = count('niches');
  const reportsCount = count('reports');
  const countriesCount = count('countries', { is_active: 1 });

  return {
    runs: runsCount,
    niches: nichesCount,
    reports: reportsCount,
    countries: countriesCount,
  };
}

/**
 * Returns comprehensive DB diagnostic data for the Settings "DB Health" section.
 * @returns {{ dbPath: string, schemaVersion: number, dbSizeBytes: number, tables: Record<string, number> }}
 */
function getDbHealth() {
  const db = getDb();
  const dbPath = getDbPath();
  let dbSizeBytes = 0;

  try {
    const st = fs.statSync(dbPath);
    dbSizeBytes = st.size;
  } catch {
    // stat failed
  }

  const settings = getSettings();
  
  // Query all non-internal tables from sqlite_master
  const tableRows = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name ASC
  `).all();

  const tableCounts = {};
  for (const row of tableRows) {
    const t = row.name;
    try {
      tableCounts[t] = count(t);
    } catch {
      tableCounts[t] = -1;
    }
  }

  return {
    dbPath,
    schemaVersion: settings.schemaVersion || 1,
    dbSizeBytes,
    tables: tableCounts,
  };
}

/* ══════════════════════════════════════════════════════════════
   PILLAR 1: SHARED PAGE / DATA CACHE ENGINE
   ══════════════════════════════════════════════════════════════ */

/**
 * Retrieves unexpired cached data by key.
 * Increments hit_count if found and still valid.
 * @param {string} cacheKey
 * @returns {Record<string, any> | null}
 */
function cacheGet(cacheKey) {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM page_cache
    WHERE cache_key = ? AND datetime(expires_at) > datetime('now')
  `).get(cacheKey);

  if (!row) return null;

  // Increment hit count
  try {
    db.prepare(`UPDATE page_cache SET hit_count = hit_count + 1 WHERE id = ?`).run(row.id);
  } catch {
    // Non-fatal
  }

  let parsedData = null;
  try {
    parsedData = JSON.parse(row.data_json);
  } catch {
    parsedData = row.data_json;
  }

  return {
    id: row.id,
    cacheKey: row.cache_key,
    nicheRef: row.niche_ref,
    keyword: row.keyword,
    countryCode: row.country_code,
    data: parsedData,
    rawHtmlPath: row.raw_html_path,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    hitCount: row.hit_count + 1,
  };
}

/**
 * Stores data in the shared page/data cache with a specified TTL.
 * @param {object} params
 * @param {string} params.cacheKey
 * @param {string} [params.nicheRef]
 * @param {string} params.keyword
 * @param {string} params.countryCode
 * @param {any} params.data
 * @param {string} [params.rawHtmlPath]
 * @param {number} [params.ttlHours=24]
 * @returns {object}
 */
function cacheSet({ cacheKey, nicheRef = null, keyword, countryCode, data, rawHtmlPath = null, ttlHours = 24 }) {
  const db = getDb();
  const dataJson = typeof data === 'string' ? data : JSON.stringify(data);
  const ttl = Number(ttlHours) || 24;

  const stmt = db.prepare(`
    INSERT INTO page_cache (
      cache_key, niche_ref, keyword, country_code, data_json,
      raw_html_path, fetched_at, expires_at, hit_count
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, datetime('now'), datetime('now', '+' || ? || ' hours'), 0
    )
    ON CONFLICT(cache_key) DO UPDATE SET
      niche_ref = excluded.niche_ref,
      data_json = excluded.data_json,
      raw_html_path = excluded.raw_html_path,
      fetched_at = datetime('now'),
      expires_at = datetime('now', '+' || ? || ' hours');
  `);

  stmt.run(cacheKey, nicheRef, keyword, countryCode, dataJson, rawHtmlPath, ttl, ttl);
  return { cacheKey, keyword, countryCode, ttlHours: ttl };
}

/**
 * Deletes a specific cache entry.
 * @param {string} cacheKey
 */
function cacheDelete(cacheKey) {
  const db = getDb();
  return db.prepare('DELETE FROM page_cache WHERE cache_key = ?').run(cacheKey);
}

/**
 * Prunes all expired cache records.
 * @returns {number} Number of pruned rows
 */
function cachePruneExpired() {
  const db = getDb();
  const info = db.prepare(`DELETE FROM page_cache WHERE datetime(expires_at) <= datetime('now')`).run();
  return info.changes;
}

/**
 * Returns cache telemetry statistics.
 * @returns {{ totalEntries: number, totalHits: number, activeEntries: number }}
 */
function cacheStats() {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_entries,
      COALESCE(SUM(hit_count), 0) as total_hits,
      SUM(CASE WHEN datetime(expires_at) > datetime('now') THEN 1 ELSE 0 END) as active_entries
    FROM page_cache
  `).get();

  return {
    totalEntries: stats ? stats.total_entries : 0,
    totalHits: stats ? stats.total_hits : 0,
    activeEntries: stats ? (stats.active_entries || 0) : 0,
  };
}

/* ══════════════════════════════════════════════════════════════
   PILLAR 7: TIMING INSTRUMENTATION & SUMMARY ENGINE
   ══════════════════════════════════════════════════════════════ */

/**
 * Logs a timed operation into timing_logs.
 * @param {object} log
 */
function logTiming(log) {
  const db = getDb();
  let runId = log.runId || null;
  if (runId) {
    const existing = db.prepare('SELECT id FROM research_runs WHERE id = ?').get(runId);
    if (!existing) runId = null;
  }

  const stmt = db.prepare(`
    INSERT INTO timing_logs (
      run_id, task_ref, agent_number, operation, started_at,
      ended_at, duration_ms, cache_hit, rate_limit_wait_ms, captcha_encountered
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const info = stmt.run(
    runId,
    log.taskRef || 'task',
    log.agentNumber || null,
    log.operation || 'browser_op',
    log.startedAt || new Date().toISOString(),
    log.endedAt || new Date().toISOString(),
    Math.round(log.durationMs || 0),
    log.cacheHit ? 1 : 0,
    Math.round(log.rateLimitWaitMs || 0),
    log.captchaEncountered ? 1 : 0
  );

  return info.lastInsertRowid;
}

/**
 * Aggregates a timing summary for a specific run (or all recent runs).
 * @param {number} [runId]
 * @returns {object} Timing summary
 */
function getTimingSummary(runId = null) {
  const db = getDb();
  let where = '';
  const params = [];

  if (runId) {
    where = 'WHERE run_id = ?';
    params.push(runId);
  }

  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_ops,
      COALESCE(SUM(duration_ms), 0) as total_duration_ms,
      COALESCE(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END), 0) as cache_hits,
      COALESCE(SUM(rate_limit_wait_ms), 0) as total_rate_limit_wait_ms,
      COALESCE(SUM(CASE WHEN rate_limit_wait_ms > 0 THEN 1 ELSE 0 END), 0) as rate_limit_waits_count,
      COALESCE(SUM(CASE WHEN captcha_encountered = 1 THEN 1 ELSE 0 END), 0) as captcha_count
    FROM timing_logs
    ${where}
  `).get(...params);

  const breakdown = db.prepare(`
    SELECT
      operation,
      COUNT(*) as count,
      SUM(duration_ms) as total_ms,
      ROUND(AVG(duration_ms), 1) as avg_ms,
      SUM(cache_hit) as cache_hits,
      SUM(rate_limit_wait_ms) as total_wait_ms
    FROM timing_logs
    ${where}
    GROUP BY operation
    ORDER BY total_ms DESC
  `).all(...params);

  return {
    runId,
    totalOperations: totals ? totals.total_ops : 0,
    totalDurationMs: totals ? totals.total_duration_ms : 0,
    cacheHits: totals ? totals.cache_hits : 0,
    cacheHitRatePct: totals && totals.total_ops > 0 ? Math.round((totals.cache_hits / totals.total_ops) * 100) : 0,
    totalRateLimitWaitMs: totals ? totals.total_rate_limit_wait_ms : 0,
    rateLimitWaitsCount: totals ? totals.rate_limit_waits_count : 0,
    captchaCount: totals ? totals.captcha_count : 0,
    breakdown,
  };
}

/**
 * Returns recent timing log rows.
 * @param {object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.runId]
 * @returns {Array<object>}
 */
function getTimingLogs(options = {}) {
  const db = getDb();
  const limit = Math.min(Number(options.limit) || 50, 500);
  let sql = 'SELECT * FROM timing_logs';
  const params = [];

  if (options.runId) {
    sql += ' WHERE run_id = ?';
    params.push(options.runId);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  return db.prepare(sql).all(...params);
}

/* ══════════════════════════════════════════════════════════════
   QUALITY SUPERVISOR REVIEWS
   ══════════════════════════════════════════════════════════════ */

/**
 * Inserts a quality review record.
 * @param {object} reviewData
 */
function insertQualityReview(reviewData) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO quality_reviews (
      run_id, agent_number, review_round, stage1_verdict,
      stage2_verdict, verdict, failed_rules_json, feedback_text, duration_ms
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const info = stmt.run(
    reviewData.run_id,
    reviewData.agent_number,
    reviewData.review_round || 1,
    reviewData.stage1_verdict || 'pass',
    reviewData.stage2_verdict || null,
    reviewData.verdict || 'pass',
    typeof reviewData.failed_rules_json === 'object'
      ? JSON.stringify(reviewData.failed_rules_json)
      : reviewData.failed_rules_json || null,
    reviewData.feedback_text || null,
    Math.round(reviewData.duration_ms || 0)
  );

  return info.lastInsertRowid;
}

/**
 * Retrieves quality review records for a run.
 * @param {number} [runId]
 * @param {object} [options]
 * @returns {Array<object>}
 */
function getQualityReviews(runId, options = {}) {
  const db = getDb();
  const limit = Math.min(Number(options.limit) || 100, 500);
  let sql = 'SELECT * FROM quality_reviews';
  const params = [];

  if (runId) {
    sql += ' WHERE run_id = ?';
    params.push(runId);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => {
    let failedRules = [];
    try {
      if (r.failed_rules_json) failedRules = JSON.parse(r.failed_rules_json);
    } catch {}
    return {
      ...r,
      failed_rules: failedRules,
    };
  });
}

/**
 * Aggregates Quality Supervisor review summary statistics for a run.
 * @param {number} runId
 * @returns {object}
 */
function getQualitySummary(runId) {
  const db = getDb();
  const runIdNum = Number(runId);

  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_reviews,
      COALESCE(SUM(CASE WHEN verdict = 'pass' THEN 1 ELSE 0 END), 0) as total_passed,
      COALESCE(SUM(CASE WHEN verdict = 'send_back' THEN 1 ELSE 0 END), 0) as total_send_backs,
      COALESCE(SUM(CASE WHEN verdict = 'escalated' THEN 1 ELSE 0 END), 0) as total_escalated
    FROM quality_reviews
    WHERE run_id = ?
  `).get(runIdNum);

  const recentReviews = getQualityReviews(runIdNum, { limit: 20 });

  const agentFailures = db.prepare(`
    SELECT agent_number, COUNT(*) as fail_count
    FROM quality_reviews
    WHERE run_id = ? AND verdict IN ('send_back', 'escalated')
    GROUP BY agent_number
    ORDER BY fail_count DESC
  `).all(runIdNum);

  const allReviews = db.prepare(`
    SELECT failed_rules_json FROM quality_reviews
    WHERE run_id = ? AND failed_rules_json IS NOT NULL
  `).all(runIdNum);

  const ruleCounts = {};
  for (const row of allReviews) {
    try {
      const parsed = JSON.parse(row.failed_rules_json);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const ruleKey = item.rule || 'UNKNOWN';
          ruleCounts[ruleKey] = (ruleCounts[ruleKey] || 0) + 1;
        }
      }
    } catch {}
  }

  const topFailedRules = Object.entries(ruleCounts)
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count);

  const totalReviews = totals ? totals.total_reviews : 0;
  const totalPassed = totals ? totals.total_passed : 0;
  const passRatePct = totalReviews > 0 ? Math.round((totalPassed / totalReviews) * 100) : 100;

  return {
    runId: runIdNum,
    totalReviews,
    totalPassed,
    totalSendBacks: totals ? totals.total_send_backs : 0,
    totalEscalated: totals ? totals.total_escalated : 0,
    passRatePct,
    recentReviews,
    topFailedAgents: agentFailures,
    topFailedRules,
  };
}

/* ══════════════════════════════════════════════════════════════
   LIVE LOGS PERSISTENCE & RETRIEVAL (P1.3f)
   ══════════════════════════════════════════════════════════════ */

let _insertLiveLogStmt = null;

/**
 * Inserts a live log record into live_logs table.
 * Uses a cached prepared statement for speed.
 * @param {object} log
 * @param {string} log.ts
 * @param {string} log.category
 * @param {string} log.message
 * @param {object} [log.meta]
 */
function insertLiveLog({ ts, category, message, meta }) {
  try {
    const db = getDb();
    if (!_insertLiveLogStmt) {
      _insertLiveLogStmt = db.prepare(`
        INSERT INTO live_logs (ts, category, message, meta_json)
        VALUES (?, ?, ?, ?)
      `);
    }
    const metaJson = meta ? JSON.stringify(meta) : null;
    const info = _insertLiveLogStmt.run(ts || new Date().toISOString(), category || 'BROWSER', message || '', metaJson);
    return info.lastInsertRowid;
  } catch (err) {
    console.error('[db] insertLiveLog error:', err.message);
    return null;
  }
}

/**
 * Retrieves the latest live logs from live_logs table, ordered chronologically (newest last).
 * @param {object} [options={}]
 * @param {number} [options.limit=500]
 * @param {string} [options.category]
 * @returns {Array<object>}
 */
function getLiveLogs(options = {}) {
  const db = getDb();
  const limit = Math.min(Number(options.limit) || 500, 2000);
  let rows = [];

  if (options.category && options.category !== 'ALL') {
    rows = db.prepare(`
      SELECT * FROM (
        SELECT id, ts, category, message, meta_json, created_at
        FROM live_logs
        WHERE category = ?
        ORDER BY id DESC
        LIMIT ?
      ) ORDER BY id ASC
    `).all(options.category, limit);
  } else {
    rows = db.prepare(`
      SELECT * FROM (
        SELECT id, ts, category, message, meta_json, created_at
        FROM live_logs
        ORDER BY id DESC
        LIMIT ?
      ) ORDER BY id ASC
    `).all(limit);
  }

  return rows.map((r) => {
    let meta = {};
    if (r.meta_json) {
      try {
        meta = JSON.parse(r.meta_json);
      } catch {}
    }
    return {
      id: r.id,
      timestamp: r.ts || r.created_at,
      category: r.category,
      type: (r.category || 'info').toLowerCase(),
      level: meta.level || 'info',
      message: r.message,
      slotId: meta.slotId !== undefined ? meta.slotId : null,
      runId: meta.runId !== undefined ? meta.runId : null,
      agentNumber: meta.agentNumber !== undefined ? meta.agentNumber : null,
      details: meta.details || null,
      ...meta,
    };
  });
}

/**
 * Returns all live_logs for export.
 * @returns {Array<object>}
 */
function getAllLiveLogs() {
  const db = getDb();
  const rows = db.prepare('SELECT id, ts, category, message, meta_json, created_at FROM live_logs ORDER BY id ASC').all();
  return rows.map((r) => {
    let meta = {};
    if (r.meta_json) {
      try {
        meta = JSON.parse(r.meta_json);
      } catch {}
    }
    return {
      id: r.id,
      timestamp: r.ts || r.created_at,
      category: r.category,
      message: r.message,
      ...meta,
    };
  });
}

/**
 * Prunes live_logs to retain only the latest maxRows (default 2000).
 * @param {number} [maxRows=2000]
 * @returns {number} Count of pruned rows
 */
function pruneLiveLogs(maxRows = 2000) {
  try {
    const db = getDb();
    const countRow = db.prepare('SELECT COUNT(*) as total FROM live_logs').get();
    const total = countRow ? countRow.total : 0;
    if (total <= maxRows) return 0;

    const excess = total - maxRows;
    const info = db.prepare(`
      DELETE FROM live_logs
      WHERE id IN (
        SELECT id FROM live_logs ORDER BY id ASC LIMIT ?
      )
    `).run(excess);

    return info.changes;
  } catch (err) {
    console.error('[db] pruneLiveLogs error:', err.message);
    return 0;
  }
}

/**
 * Clears all rows in live_logs table.
 * @returns {number} Count of deleted rows
 */
function clearLiveLogs() {
  const db = getDb();
  const info = db.prepare('DELETE FROM live_logs').run();
  return info.changes;
}

/* ══════════════════════════════════════════════════════════════
   SCHEDULES & SCHEDULE FIRINGS (P1.4 Scheduler Agent)
   ══════════════════════════════════════════════════════════════ */

/**
 * Returns all schedules with their latest firing info and firings count.
 * @param {object} [options={}]
 * @returns {Array<object>}
 */
function getSchedules(options = {}) {
  const db = getDb();
  const where = options.enabledOnly ? 'WHERE enabled = 1' : '';
  const rows = db.prepare(`SELECT * FROM schedules ${where} ORDER BY id DESC`).all();

  return rows.map((s) => {
    let runConfig = {};
    try {
      runConfig = typeof s.run_config_json === 'string' ? JSON.parse(s.run_config_json) : s.run_config_json;
    } catch {
      runConfig = {};
    }

    const firingsCount = db.prepare('SELECT COUNT(*) as cnt FROM schedule_firings WHERE schedule_id = ?').get(s.id)?.cnt || 0;
    const lastFiring = db.prepare('SELECT * FROM schedule_firings WHERE schedule_id = ? ORDER BY id DESC LIMIT 1').get(s.id) || null;

    return {
      ...s,
      enabled: Boolean(s.enabled),
      run_config: runConfig,
      firings_count: firingsCount,
      last_firing: lastFiring,
    };
  });
}

/**
 * Returns a single schedule by ID with recent firings.
 * @param {number} scheduleId
 * @returns {object | null}
 */
function getSchedule(scheduleId) {
  const db = getDb();
  const s = db.prepare('SELECT * FROM schedules WHERE id = ?').get(Number(scheduleId));
  if (!s) return null;

  let runConfig = {};
  try {
    runConfig = typeof s.run_config_json === 'string' ? JSON.parse(s.run_config_json) : s.run_config_json;
  } catch {
    runConfig = {};
  }

  const firings = db.prepare('SELECT * FROM schedule_firings WHERE schedule_id = ? ORDER BY id DESC LIMIT 20').all(s.id);

  return {
    ...s,
    enabled: Boolean(s.enabled),
    run_config: runConfig,
    firings,
  };
}

/**
 * Returns firings for a given schedule ID.
 * @param {number} scheduleId
 * @param {number} [limit=10]
 * @returns {Array<object>}
 */
function getScheduleFirings(scheduleId, limit = 10) {
  const db = getDb();
  return db.prepare(`
    SELECT sf.*, r.run_name, r.status AS run_status 
    FROM schedule_firings sf
    LEFT JOIN research_runs r ON sf.run_id = r.id
    WHERE sf.schedule_id = ? 
    ORDER BY sf.id DESC 
    LIMIT ?
  `).all(Number(scheduleId), limit);
}

/**
 * Inserts a recorded incoming HTTP request to Jarvis Gateway into jarvis_requests.
 * @param {object} data
 * @returns {import('better-sqlite3').RunResult}
 */
function logJarvisRequest(data = {}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO jarvis_requests (
      method, path, status_code, key_valid, duration_ms, client_ip, request_payload, response_payload, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  return stmt.run(
    data.method || 'GET',
    data.path || '/',
    data.statusCode || 200,
    data.keyValid ? 1 : 0,
    data.durationMs || 0,
    data.clientIp || '127.0.0.1',
    data.requestPayload ? (typeof data.requestPayload === 'string' ? data.requestPayload : JSON.stringify(data.requestPayload)) : '{}',
    data.responsePayload ? (typeof data.responsePayload === 'string' ? data.responsePayload : JSON.stringify(data.responsePayload)) : null
  );
}

/**
 * Retrieves the most recent incoming Jarvis requests for UI & telemetry inspection.
 * @param {number} [limit=10]
 * @returns {Array<object>}
 */
function getJarvisRequests(limit = 10) {
  const db = getDb();
  return db.prepare(`
    SELECT id, method, path, status_code, key_valid, duration_ms, client_ip, request_payload, response_payload, created_at
    FROM jarvis_requests
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
}

/* ══════════════════════════════════════════════════════════════
   SENIOR CONSULTANT CHAT DB METHODS (P2.1)
   ══════════════════════════════════════════════════════════════ */

function getConsultantChats() {
  const db = getDb();
  return db.prepare(`SELECT * FROM consultant_chats ORDER BY updated_at DESC`).all();
}

function createConsultantChat(title = 'Strategy Consultation') {
  const db = getDb();
  const res = db.prepare(`INSERT INTO consultant_chats (title) VALUES (?)`).run(title);
  return db.prepare(`SELECT * FROM consultant_chats WHERE id = ?`).get(res.lastInsertRowid);
}

function getConsultantMessages(chatId) {
  const db = getDb();
  return db.prepare(`
    SELECT id, chat_id, role, content, tool_calls, created_at
    FROM consultant_messages
    WHERE chat_id = ?
    ORDER BY id ASC
  `).all(chatId);
}

function addConsultantMessage(chatId, role, content, toolCalls = null) {
  const db = getDb();
  const toolCallsStr = toolCalls ? (typeof toolCalls === 'string' ? toolCalls : JSON.stringify(toolCalls)) : null;
  const res = db.prepare(`
    INSERT INTO consultant_messages (chat_id, role, content, tool_calls)
    VALUES (?, ?, ?, ?)
  `).run(chatId, role, content, toolCallsStr);
  
  db.prepare(`UPDATE consultant_chats SET updated_at = datetime('now') WHERE id = ?`).run(chatId);
  return db.prepare(`SELECT * FROM consultant_messages WHERE id = ?`).get(res.lastInsertRowid);
}

function deleteConsultantChat(chatId) {
  const db = getDb();
  return db.prepare(`DELETE FROM consultant_chats WHERE id = ?`).run(chatId);
}

module.exports = {
  getDbPath,
  getDb,
  runMigrations,
  closeDb,
  insert,
  update,
  findBy,
  findOne,
  deleteBy,
  count,
  getSettings,
  saveSettings,
  getCountries,
  createRun,
  parseRun: (runId) => require('./agents/criteriaParser').parseRun(runId),
  getRun,
  getRuns,
  updateAgentStatus,
  getNichesByRun,
  getCounts,
  getDbHealth,
  cacheGet,
  cacheSet,
  cacheDelete,
  cachePruneExpired,
  cacheStats,
  logTiming,
  getTimingSummary,
  getTimingLogs,
  insertQualityReview,
  getQualityReviews,
  getQualitySummary,
  insertLiveLog,
  getLiveLogs,
  getAllLiveLogs,
  pruneLiveLogs,
  clearLiveLogs,
  getSchedules,
  getSchedule,
  getScheduleFirings,
  logJarvisRequest,
  getJarvisRequests,
  getConsultantChats,
  createConsultantChat,
  getConsultantMessages,
  addConsultantMessage,
  deleteConsultantChat,
};
