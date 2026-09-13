'use strict';

/**
 * Migration v9: Secrets Persistence & Senior Consultant Chat Agent (P2.1)
 * - Adds openai_api_key, anthropic_api_key, groq_api_key columns to app_settings
 * - Creates consultant_chats table for Senior Consultant Chat Agent threads
 * - Creates consultant_messages table for storing chat conversation turns & tool actions
 * - Updates app_settings schema_version to 9
 */

function up(db) {
  const runMigration = db.transaction(() => {
    // 1. Extend app_settings with multi-provider API keys
    const settingsCols = new Set(
      db.prepare("PRAGMA table_info('app_settings')").all().map((c) => c.name)
    );

    if (!settingsCols.has('openai_api_key')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN openai_api_key TEXT;`);
    }
    if (!settingsCols.has('anthropic_api_key')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN anthropic_api_key TEXT;`);
    }
    if (!settingsCols.has('groq_api_key')) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN groq_api_key TEXT;`);
    }

    // 2. Create consultant_chats table
    db.exec(`
      CREATE TABLE IF NOT EXISTS consultant_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL DEFAULT 'Strategy Consultation',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 3. Create consultant_messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS consultant_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        tool_calls TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (chat_id) REFERENCES consultant_chats(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_consultant_messages_chat_id ON consultant_messages(chat_id);
    `);

    // 4. Update schema_version in app_settings
    db.prepare(`UPDATE app_settings SET schema_version = 9 WHERE id = 1`).run();
  });

  runMigration();
}

module.exports = {
  version: 9,
  name: 'secrets_and_consultant_chat',
  up,
};
