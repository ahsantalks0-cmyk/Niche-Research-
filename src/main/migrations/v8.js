'use strict';

/**
 * Migration v8: Jarvis Gateway Agent (Agent #5) Schema (P1.5)
 * - Adds jarvis_enabled and jarvis_port columns to app_settings
 * - Extends jarvis_requests table with method, path, status_code, key_valid, duration_ms, client_ip
 * - Updates app_settings schema_version to 8
 */

function up(db) {
  const runMigration = db.transaction(() => {
    // 1. Extend app_settings with jarvis configuration columns
    const settingsCols = new Set(
      db.prepare("PRAGMA table_info('app_settings')").all().map((c) => c.name)
    );

    if (!settingsCols.has('jarvis_enabled')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN jarvis_enabled INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!settingsCols.has('jarvis_port')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN jarvis_port INTEGER NOT NULL DEFAULT 47821;`);
    }

    // 2. Extend jarvis_requests table
    const reqCols = new Set(
      db.prepare("PRAGMA table_info('jarvis_requests')").all().map((c) => c.name)
    );

    if (!reqCols.has('method')) {
      db.exec(`ALTER TABLE jarvis_requests ADD COLUMN method TEXT;`);
    }
    if (!reqCols.has('path')) {
      db.exec(`ALTER TABLE jarvis_requests ADD COLUMN path TEXT;`);
    }
    if (!reqCols.has('status_code')) {
      db.exec(`ALTER TABLE jarvis_requests ADD COLUMN status_code INTEGER;`);
    }
    if (!reqCols.has('key_valid')) {
      db.exec(`ALTER TABLE jarvis_requests ADD COLUMN key_valid INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!reqCols.has('duration_ms')) {
      db.exec(`ALTER TABLE jarvis_requests ADD COLUMN duration_ms INTEGER NOT NULL DEFAULT 0;`);
    }
    if (!reqCols.has('client_ip')) {
      db.exec(`ALTER TABLE jarvis_requests ADD COLUMN client_ip TEXT;`);
    }

    // Create index on jarvis_requests for fast recent-history queries
    db.exec(`CREATE INDEX IF NOT EXISTS idx_jarvis_requests_id_desc ON jarvis_requests(id DESC);`);

    // 3. Update schema_version in app_settings
    db.prepare(`UPDATE app_settings SET schema_version = 8 WHERE id = 1`).run();
  });

  runMigration();
}

module.exports = {
  version: 8,
  name: 'jarvis_gateway_tables',
  up,
};
