'use strict';

/**
 * Migration v6: Live Logs Persistence & AI Model State (P1.3f)
 * - Creates live_logs table for persisting real-time engine & agent telemetry
 * - Adds ai_provider, ai_model, ai_model_invalid, ai_model_invalid_reason columns to app_settings
 * - Updates app_settings schema_version to 6
 */

function up(db) {
  const runMigration = db.transaction(() => {
    // 1. live_logs table (P1.3f Part 1)
    db.exec(`
      CREATE TABLE IF NOT EXISTS live_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        meta_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_live_logs_category ON live_logs(category);
      CREATE INDEX IF NOT EXISTS idx_live_logs_id_desc ON live_logs(id DESC);
    `);

    // 2. Extend app_settings with AI model status columns if missing
    const tableInfo = db.prepare("PRAGMA table_info('app_settings')").all();
    const existingCols = new Set(tableInfo.map((c) => c.name));

    if (!existingCols.has('ai_provider')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN ai_provider TEXT DEFAULT 'gemini';`);
    }
    if (!existingCols.has('ai_model')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN ai_model TEXT DEFAULT 'gemini-2.5-flash';`);
    }
    if (!existingCols.has('ai_model_invalid')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN ai_model_invalid INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!existingCols.has('ai_model_invalid_reason')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN ai_model_invalid_reason TEXT;`);
    }

    // 3. Update schema_version in app_settings
    db.prepare(`UPDATE app_settings SET schema_version = 6 WHERE id = 1`).run();
  });

  runMigration();
}

module.exports = {
  version: 6,
  name: 'live_logs_and_ai_model_state',
  up,
};
