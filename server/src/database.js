import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

function parseOptions(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    messageId: row.message_id,
    kind: row.kind,
    value: row.value,
    respondent: row.respondent || '',
    createdAt: row.created_at,
  };
}

function mapMessage(row, responses = []) {
  if (!row) return null;
  return {
    id: row.id,
    room: row.room,
    type: row.type,
    target: row.target || '',
    message: row.message,
    responseOptions: parseOptions(row.response_options),
    allowText: Boolean(row.allow_text),
    status: row.status,
    createdAt: row.created_at,
    closedAt: row.closed_at || null,
    responses,
  };
}

export function createDatabase(databasePath) {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = new DatabaseSync(databasePath, { timeout: 5000 });
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('call', 'question')),
      target TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      response_options TEXT NOT NULL DEFAULT '[]',
      allow_text INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
      created_at TEXT NOT NULL,
      closed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_messages_room_created
      ON messages(room, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_room_status
      ON messages(room, status);

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('preset', 'text')),
      value TEXT NOT NULL,
      respondent TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_responses_message_created
      ON responses(message_id, created_at ASC);
  `);

  const selectResponses = db.prepare(
    'SELECT * FROM responses WHERE message_id = ? ORDER BY created_at ASC',
  );
  const selectMessage = db.prepare('SELECT * FROM messages WHERE id = ?');

  function attachResponses(row) {
    return mapMessage(
      row,
      selectResponses.all(row.id).map(mapResponse),
    );
  }

  return {
    close() {
      db.close();
    },

    healthCheck() {
      return db.prepare('SELECT 1 AS ok').get().ok === 1;
    },

    createMessage(input) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare(`
        INSERT INTO messages (
          id, room, type, target, message, response_options, allow_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.room,
        input.type,
        input.target,
        input.message,
        JSON.stringify(input.responseOptions),
        input.allowText ? 1 : 0,
        createdAt,
      );
      return this.getMessage(id);
    },

    getMessage(id) {
      const row = selectMessage.get(id);
      return row ? attachResponses(row) : null;
    },

    getState(room, historyLimit = 100) {
      const activeRows = db
        .prepare(
          `SELECT * FROM messages
           WHERE room = ? AND status = 'active'
           ORDER BY created_at DESC`,
        )
        .all(room);
      const historyRows = db
        .prepare(
          `SELECT * FROM messages
           WHERE room = ?
           ORDER BY created_at DESC
           LIMIT ?`,
        )
        .all(room, historyLimit);

      return {
        room,
        active: activeRows.map(attachResponses),
        history: historyRows.map(attachResponses),
      };
    },

    createResponse(messageId, input) {
      const message = this.getMessage(messageId);
      if (!message) return { error: 'not_found' };
      if (message.status !== 'active') return { error: 'closed', message };
      if (input.kind === 'preset' && !message.responseOptions.includes(input.value)) {
        return { error: 'invalid_option', message };
      }
      if (input.kind === 'text' && !message.allowText) {
        return { error: 'text_not_allowed', message };
      }

      const response = {
        id: randomUUID(),
        messageId,
        kind: input.kind,
        value: input.value,
        respondent: input.respondent,
        createdAt: new Date().toISOString(),
      };
      db.prepare(`
        INSERT INTO responses (id, message_id, kind, value, respondent, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        response.id,
        response.messageId,
        response.kind,
        response.value,
        response.respondent,
        response.createdAt,
      );
      return { response, message: this.getMessage(messageId) };
    },

    closeMessage(id) {
      const closedAt = new Date().toISOString();
      const result = db
        .prepare(
          `UPDATE messages
           SET status = 'closed', closed_at = ?
           WHERE id = ? AND status = 'active'`,
        )
        .run(closedAt, id);
      if (result.changes === 0) return this.getMessage(id);
      return this.getMessage(id);
    },
  };
}
