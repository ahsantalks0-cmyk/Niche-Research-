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

const MIGRATIONS = [
  migrationV1,
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
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      userDataDir = app.getPath('userData');
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
 * @param {import('better-sqlite3').Database} db
 */
function runMigrations(db) {
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
    geminiApiKey: row.gemini_api_key || '',
    jarvisApiKey: row.jarvis_api_key || '',
    whiteLabelBrand: row.white_label_brand || '',
    lastUpdateCheck: row.last_update_check || null,
    schemaVersion: row.schema_version,
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
    geminiApiKey: 'gemini_api_key',
    jarvisApiKey: 'jarvis_api_key',
    whiteLabelBrand: 'white_label_brand',
    lastUpdateCheck: 'last_update_check',
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
function createRun(runData, countryCodes = ['US'], criteriaBrief = {}) {
  const db = getDb();

  const AGENT_LAYERS = [
    { num: 1, name: 'Coordinator', layer: 'control' },
    { num: 2, name: 'Approval Gate', layer: 'control' },
    { num: 3, name: 'Jarvis Gateway', layer: 'control' },
    { num: 4, name: 'Scheduler Agent', layer: 'control' },
    { num: 5, name: 'Senior Consultant Chat', layer: 'control' },
    { num: 6, name: 'Trend Scanner', layer: 'discovery' },
    { num: 7, name: 'SERP Cartographer', layer: 'discovery' },
    { num: 8, name: 'Forum Miner', layer: 'discovery' },
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
    { num: 31, name: 'Quality Supervisor', layer: 'qa_reporting' },
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
      domain: runData.domain || null,
      competition_level: runData.competition_level || 'medium',
      status: runData.status || 'pending',
      approval_gate_passed: runData.approval_gate_passed ? 1 : 0,
      auto_approve: runData.auto_approve ? 1 : 0,
      trigger_source: runData.trigger_source || 'ui',
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

    // 3. Insert run_criteria
    insert('run_criteria', {
      run_id: runId,
      raw_input: JSON.stringify(runData),
      parsed_brief: JSON.stringify(criteriaBrief),
      parser_version: '1.0',
    });

    // 4. Initialize agent_status for all 35 agents
    const insertAgentStmt = db.prepare(`
      INSERT INTO agent_status (run_id, agent_number, agent_name, layer, status)
      VALUES (?, ?, ?, ?, 'idle')
    `);

    for (const a of AGENT_LAYERS) {
      insertAgentStmt.run(runId, a.num, a.name, a.layer);
    }

    return getRun(runId);
  });

  return createTx();
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

  return {
    ...run,
    business_modes: run.business_modes ? JSON.parse(run.business_modes) : [],
    dh_execution_plan: run.dh_execution_plan ? JSON.parse(run.dh_execution_plan) : null,
    countries,
    criteria: criteria ? { ...criteria, parsed_brief: JSON.parse(criteria.parsed_brief), raw_input: JSON.parse(criteria.raw_input) } : null,
    agents,
  };
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
  const tables = [
    'research_runs', 'run_countries', 'run_criteria', 'agent_status', 'countries',
    'niches', 'niche_history', 'keywords', 'serp_results', 'competitors',
    'content_gaps', 'unmet_intents', 'social_competition', 'paid_ads',
    'digital_product_market', 'ecomm_market', 'digital_product_list',
    'ecomm_product_list', 'affiliate_programs', 'rpm_data', 'personas',
    'geo_localization', 'domain_brand', 'country_benchmarks', 'opportunity_scores',
    'final_verdicts', 'risk_flags', 'qa_checks', 'reports', 'seo_handoff_packages',
    're_research_log', 'scheduler_jobs', 'chat_messages', 'jarvis_requests',
    'app_settings', 'schema_migrations',
  ];

  const tableCounts = {};
  for (const t of tables) {
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
  getRun,
  updateAgentStatus,
  getNichesByRun,
  getCounts,
  getDbHealth,
};
