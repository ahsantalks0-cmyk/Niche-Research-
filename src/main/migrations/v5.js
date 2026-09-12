'use strict';

/**
 * Migration v5: Quality Supervisor Schema Updates (P1.3)
 * - Creates quality_reviews table for tracking Stage 1 & Stage 2 agent output audit results
 * - Updates app_settings schema_version to 5
 */

function up(db) {
  const runMigration = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS quality_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        agent_number INTEGER NOT NULL,
        review_round INTEGER NOT NULL DEFAULT 1,
        stage1_verdict TEXT NOT NULL,
        stage2_verdict TEXT,
        verdict TEXT NOT NULL,
        failed_rules_json TEXT,
        feedback_text TEXT,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (run_id) REFERENCES research_runs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_quality_reviews_run ON quality_reviews(run_id);
      CREATE INDEX IF NOT EXISTS idx_quality_reviews_agent ON quality_reviews(run_id, agent_number);
    `);

    db.prepare(`UPDATE app_settings SET schema_version = 5 WHERE id = 1`).run();
  });

  runMigration();
}

module.exports = {
  version: 5,
  name: 'quality_supervisor_reviews',
  up,
};
