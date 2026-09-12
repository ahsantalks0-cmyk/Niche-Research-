'use strict';

/**
 * Migration v3: Criteria Parser Agent Schema Updates (P1.1)
 * - Adds own_niche_name column to research_runs
 * - Ensures agent_status row for agent #2 is named 'Criteria Parser Agent'
 * - Updates app_settings schema_version to 3
 */

function up(db) {
  const runMigration = db.transaction(() => {
    // 1. Extend research_runs with own_niche_name if missing
    const tableInfo = db.prepare("PRAGMA table_info('research_runs')").all();
    const existingCols = new Set(tableInfo.map((c) => c.name));

    if (!existingCols.has('own_niche_name')) {
      db.exec(`ALTER TABLE research_runs ADD COLUMN own_niche_name TEXT;`);
    }

    // 2. Ensure agent #2 is named 'Criteria Parser Agent' in agent_status
    db.exec(`
      UPDATE agent_status 
      SET agent_name = 'Criteria Parser Agent' 
      WHERE agent_number = 2;
    `);

    // 3. Update schema_version in app_settings
    db.prepare(`UPDATE app_settings SET schema_version = 3 WHERE id = 1`).run();
  });

  runMigration();
}

module.exports = {
  version: 3,
  name: 'criteria_parser_and_own_niche_name',
  up,
};
