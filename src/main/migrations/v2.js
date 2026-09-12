'use strict';

/**
 * Migration v2: Browser Engine Architecture Tables (P0.5)
 * - page_cache: Shared Page/Data cache across agents and business modes
 * - timing_logs: Full timing instrumentation and latency breakdown
 * - app_settings engine additions (browser_slots, cache_ttl_hours, rate_limit_google_per_min)
 */

function up(db) {
  const runMigration = db.transaction(() => {
    // 1. Shared page/data cache table
    db.exec(`
      CREATE TABLE IF NOT EXISTS page_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cache_key TEXT NOT NULL UNIQUE,
        niche_ref TEXT,
        keyword TEXT NOT NULL,
        country_code TEXT NOT NULL,
        data_json TEXT NOT NULL,
        raw_html_path TEXT,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_page_cache_key ON page_cache(cache_key);
      CREATE INDEX IF NOT EXISTS idx_page_cache_lookup ON page_cache(keyword, country_code);
    `);

    // 2. Timing logs table for timing instrumentation (Pillar 7)
    db.exec(`
      CREATE TABLE IF NOT EXISTS timing_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        task_ref TEXT NOT NULL,
        agent_number INTEGER,
        operation TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        cache_hit INTEGER NOT NULL DEFAULT 0,
        rate_limit_wait_ms INTEGER NOT NULL DEFAULT 0,
        captcha_encountered INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (run_id) REFERENCES research_runs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_timing_logs_run ON timing_logs(run_id);
      CREATE INDEX IF NOT EXISTS idx_timing_logs_op ON timing_logs(operation);
    `);

    // 3. Extend app_settings with engine settings if missing
    const tableInfo = db.prepare("PRAGMA table_info('app_settings')").all();
    const existingCols = new Set(tableInfo.map((c) => c.name));

    if (!existingCols.has('browser_slots')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN browser_slots INTEGER NOT NULL DEFAULT 3;`);
    }
    if (!existingCols.has('cache_ttl_hours')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN cache_ttl_hours INTEGER NOT NULL DEFAULT 24;`);
    }
    if (!existingCols.has('rate_limit_google_per_min')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN rate_limit_google_per_min INTEGER NOT NULL DEFAULT 8;`);
    }
    if (!existingCols.has('max_retries')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 3;`);
    }

    // Update schema_version in app_settings
    db.prepare(`UPDATE app_settings SET schema_version = 2 WHERE id = 1`).run();
  });

  runMigration();
}

module.exports = {
  version: 2,
  name: 'browser_engine_cache_and_timing_logs',
  up,
};
