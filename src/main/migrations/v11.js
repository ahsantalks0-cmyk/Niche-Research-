'use strict';

/**
 * Migration v11: Trend & Demand Signal Agent (Agent #7) (P3.2)
 * - Creates trend_data table
 * - Adds demand_verdict column to niches table
 * - Updates app_settings schema_version to 11
 */

function up(db) {
  const runMigration = db.transaction(() => {
    // 1. Create trend_data table
    db.exec(`
      CREATE TABLE IF NOT EXISTS trend_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        niche_id INTEGER NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
        run_id INTEGER NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
        country TEXT NOT NULL DEFAULT 'US',
        interest_avg REAL,
        direction TEXT CHECK(direction IN ('RISING', 'STABLE', 'DECLINING', 'INSUFFICIENT_DATA', 'UNKNOWN')),
        seasonality TEXT,
        timeline_json TEXT,
        autocomplete_count INTEGER DEFAULT 0,
        autocomplete_json TEXT,
        verdict TEXT CHECK(verdict IN ('STRONG', 'MODERATE', 'WEAK', 'INSUFFICIENT_DATA')),
        checked_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_trend_data_niche ON trend_data(niche_id);
      CREATE INDEX IF NOT EXISTS idx_trend_data_run ON trend_data(run_id);
    `);

    // 2. Add demand_verdict to niches table
    const nicheCols = new Set(
      db.prepare("PRAGMA table_info('niches')").all().map((c) => c.name)
    );

    if (!nicheCols.has('demand_verdict')) {
      db.exec(`ALTER TABLE niches ADD COLUMN demand_verdict TEXT;`);
    }

    db.exec(`UPDATE app_settings SET schema_version = 11 WHERE id = 1;`);
  });

  runMigration();
}

module.exports = {
  version: 11,
  name: 'v11_trend_demand',
  up,
};
