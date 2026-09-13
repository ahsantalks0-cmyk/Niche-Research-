'use strict';

/**
 * Migration v7: Scheduler Agent & Recurring Runs (P1.4)
 * - Adds schedules table (id, name, enabled, schedule_type, interval_minutes, time_of_day, day_of_week, cron_expr, run_config_json, last_run_at, next_run_at, last_run_id, created_at, updated_at)
 * - Adds schedule_firings table (id, schedule_id, run_id, fired_at, status, error)
 * - Adds schedule_id column to research_runs table
 * - Creates performance indexes for scheduler tick queries and firing histories
 * - Updates app_settings schema_version to 7
 */

function up(db) {
  const runMigration = db.transaction(() => {
    // 1. Create schedules table
    db.exec(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        schedule_type TEXT NOT NULL CHECK(schedule_type IN ('interval', 'daily', 'weekly', 'cron')),
        interval_minutes INTEGER,
        time_of_day TEXT,
        day_of_week INTEGER,
        cron_expr TEXT,
        run_config_json TEXT NOT NULL,
        last_run_at TEXT,
        next_run_at TEXT NOT NULL,
        last_run_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (last_run_id) REFERENCES research_runs(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_schedules_enabled_next ON schedules(enabled, next_run_at);
    `);

    // 2. Create schedule_firings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS schedule_firings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        run_id INTEGER,
        fired_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL CHECK(status IN ('launched', 'failed')),
        error TEXT,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (run_id) REFERENCES research_runs(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_schedule_firings_schedule_id ON schedule_firings(schedule_id);
    `);

    // 3. Add schedule_id column to research_runs if missing
    const runsInfo = db.prepare("PRAGMA table_info('research_runs')").all();
    const existingRunCols = new Set(runsInfo.map((c) => c.name));

    if (!existingRunCols.has('schedule_id')) {
      db.exec(`ALTER TABLE research_runs ADD COLUMN schedule_id INTEGER;`);
    }

    // 4. Update schema_version in app_settings
    db.prepare(`UPDATE app_settings SET schema_version = 7 WHERE id = 1`).run();
  });

  runMigration();
}

module.exports = {
  version: 7,
  name: 'scheduler_agent_tables',
  up,
};
