'use strict';

/**
 * Migration v4: Department Head & Chain Engine Schema Updates (P1.2)
 * - Adds chain_state (JSON) column to research_runs for persisting paused/active execution states across restarts
 * - Ensures agent_status row for agent #1 is named 'Department Head Agent'
 * - Updates app_settings schema_version to 4
 */

function up(db) {
  const runMigration = db.transaction(() => {
    // 1. Extend research_runs with chain_state if missing
    const tableInfo = db.prepare("PRAGMA table_info('research_runs')").all();
    const existingCols = new Set(tableInfo.map((c) => c.name));

    if (!existingCols.has('chain_state')) {
      db.exec(`ALTER TABLE research_runs ADD COLUMN chain_state TEXT;`);
    }

    // 2. Ensure agent #1 is named 'Department Head Agent' in agent_status
    db.exec(`
      UPDATE agent_status 
      SET agent_name = 'Department Head Agent' 
      WHERE agent_number = 1;
    `);

    // 3. Update schema_version in app_settings
    db.prepare(`UPDATE app_settings SET schema_version = 4 WHERE id = 1`).run();
  });

  runMigration();
}

module.exports = {
  version: 4,
  name: 'department_head_and_chain_state',
  up,
};
