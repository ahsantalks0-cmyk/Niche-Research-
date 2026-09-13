'use strict';

/**
 * Migration v10: Niche Discovery Agent (Agent #6) Columns (P3.1)
 * - Adds source, signal_evidence, countries columns to niches table
 * - Updates app_settings schema_version to 10
 */

function up(db) {
  const runMigration = db.transaction(() => {
    const nicheCols = new Set(
      db.prepare("PRAGMA table_info('niches')").all().map((c) => c.name)
    );

    if (!nicheCols.has('source')) {
      db.exec(`ALTER TABLE niches ADD COLUMN source TEXT;`);
    }
    if (!nicheCols.has('signal_evidence')) {
      db.exec(`ALTER TABLE niches ADD COLUMN signal_evidence TEXT;`);
    }
    if (!nicheCols.has('countries')) {
      db.exec(`ALTER TABLE niches ADD COLUMN countries TEXT;`);
    }

    db.exec(`UPDATE app_settings SET schema_version = 10 WHERE id = 1;`);
  });

  runMigration();
}

module.exports = {
  version: 10,
  name: 'v10_niche_discovery',
  up,
};
