/**
 * PostgreSQL memo store, used whenever `DATABASE_URL` is configured.
 *
 * The schema is kept close to `database/schema.sql` and is applied idempotently
 * on first use, so a fresh database and an upgraded one both converge.
 */

import { Pool } from "pg";
import { redactProtected, type Note } from "./memo";

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 4),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      // Managed providers terminate unencrypted connections; local sockets have no TLS.
      ssl: /\bsslmode=disable\b/.test(connectionString || "")
        ? false
        : /^postgres(ql)?:\/\/[^/]*[^/:]+:\d+/.test(connectionString || "")
          ? { rejectUnauthorized: false }
          : undefined,
    });
    pool.on("error", (error) => console.error("Postgres pool error", error));
  }
  return pool;
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    folder TEXT NOT NULL DEFAULT 'inbox',
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    favorite BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    protected BOOLEAN NOT NULL DEFAULT FALSE,
    encrypted_content TEXT NOT NULL DEFAULT '',
    recovery_encrypted_content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'yellow'
  )`,
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT 'inbox'",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS protected BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS encrypted_content TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS recovery_encrypted_content TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE notes ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'yellow'",
  "CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes (updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS notes_due_at_idx ON notes (due_at)",
  "CREATE INDEX IF NOT EXISTS notes_deleted_archived_idx ON notes (deleted, archived)",
  "CREATE INDEX IF NOT EXISTS notes_folder_idx ON notes (folder)",
];

function ensureSchema() {
  if (!schemaReady)
    schemaReady = (async () => {
      for (const statement of schemaStatements) await getPool().query(statement);
    })().catch((error) => {
      // Let the next request retry rather than caching the failure forever.
      schemaReady = undefined;
      throw error;
    });
  return schemaReady;
}

function mapRow(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    folder: String(row.folder || "inbox"),
    dueAt: row.due_at ? new Date(String(row.due_at)).toISOString() : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    favorite: Boolean(row.favorite),
    archived: Boolean(row.archived),
    pinned: Boolean(row.pinned),
    deleted: Boolean(row.deleted),
    protected: Boolean(row.protected),
    encryptedContent: String(row.encrypted_content || "") || undefined,
    recoveryEncryptedContent: String(row.recovery_encrypted_content || "") || undefined,
    color: String(row.color),
  };
}

export async function listPostgresNotes(): Promise<Note[]> {
  await ensureSchema();
  const result = await getPool().query("SELECT * FROM notes ORDER BY updated_at DESC");
  return result.rows.map(mapRow);
}

const upsertSql = `INSERT INTO notes (id,title,content,tags,folder,due_at,created_at,updated_at,favorite,archived,pinned,deleted,protected,encrypted_content,recovery_encrypted_content,color)
  VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
  ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,tags=EXCLUDED.tags,folder=EXCLUDED.folder,due_at=EXCLUDED.due_at,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at,favorite=EXCLUDED.favorite,archived=EXCLUDED.archived,pinned=EXCLUDED.pinned,deleted=EXCLUDED.deleted,protected=EXCLUDED.protected,encrypted_content=EXCLUDED.encrypted_content,recovery_encrypted_content=EXCLUDED.recovery_encrypted_content,color=EXCLUDED.color`;

/**
 * Writes memos in one transaction. With `replace`, memos absent from `notes`
 * are removed, which is how a permanent delete reaches the store.
 */
export async function upsertPostgresNotes(notes: Note[], replace = false) {
  await ensureSchema();
  // Protected plaintext must not reach the store even if a client sent it.
  const safeNotes = redactProtected(notes);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    if (replace && safeNotes.length)
      await client.query("DELETE FROM notes WHERE NOT (id = ANY($1::text[]))", [
        safeNotes.map((note) => note.id),
      ]);
    else if (replace) await client.query("DELETE FROM notes");

    for (const note of safeNotes)
      await client.query(upsertSql, [
        note.id,
        note.title,
        note.content,
        JSON.stringify(note.tags),
        note.folder || "inbox",
        note.dueAt || null,
        note.createdAt || note.updatedAt,
        note.updatedAt,
        Boolean(note.favorite),
        Boolean(note.archived),
        Boolean(note.pinned),
        Boolean(note.deleted),
        Boolean(note.protected),
        note.encryptedContent || "",
        note.recoveryEncryptedContent || "",
        note.color,
      ]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
