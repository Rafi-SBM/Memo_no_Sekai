import { Pool } from "pg";
import type { StoredNote } from "./local-db";

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function ensureSchema() {
  if (!schemaReady)
    schemaReady = getPool()
      .query(
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
      )
      .then(() =>
        getPool().query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder TEXT NOT NULL DEFAULT 'inbox'"),
      )
      .then(() => getPool().query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ"))
      .then(() =>
        getPool().query(
          "ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        ),
      )
      .then(() =>
        getPool().query(
          "ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        ),
      )
      .then(() =>
        getPool().query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS favorite BOOLEAN NOT NULL DEFAULT FALSE"),
      )
      .then(() =>
        getPool().query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE"),
      )
      .then(() =>
        getPool().query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE"),
      )
      .then(() =>
        getPool().query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE"),
      )
      .then(() =>
        getPool().query(
          "ALTER TABLE notes ADD COLUMN IF NOT EXISTS protected BOOLEAN NOT NULL DEFAULT FALSE",
        ),
      )
      .then(() =>
        getPool().query(
          "ALTER TABLE notes ADD COLUMN IF NOT EXISTS encrypted_content TEXT NOT NULL DEFAULT ''",
        ),
      )
      .then(() =>
        getPool().query(
          "ALTER TABLE notes ADD COLUMN IF NOT EXISTS recovery_encrypted_content TEXT NOT NULL DEFAULT ''",
        ),
      )
      .then(() =>
        getPool().query("ALTER TABLE notes ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'yellow'"),
      )
      .then(() =>
        getPool().query("CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes (updated_at DESC)"),
      )
      .then(() => getPool().query("CREATE INDEX IF NOT EXISTS notes_due_at_idx ON notes (due_at)"))
      .then(() =>
        getPool().query("CREATE INDEX IF NOT EXISTS notes_deleted_archived_idx ON notes (deleted, archived)"),
      )
      .then(() => getPool().query("CREATE INDEX IF NOT EXISTS notes_folder_idx ON notes (folder)"))
      .then(() => undefined);
  return schemaReady;
}

function mapRow(row: Record<string, unknown>): StoredNote {
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

export async function listPostgresNotes() {
  await ensureSchema();
  const result = await getPool().query("SELECT * FROM notes ORDER BY updated_at DESC");
  return result.rows.map(mapRow);
}

export async function upsertPostgresNotes(notes: StoredNote[], replace = false) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    if (replace && notes.length)
      await client.query("DELETE FROM notes WHERE NOT (id = ANY($1::text[]))", [
        notes.map((note) => note.id),
      ]);
    else if (replace) await client.query("DELETE FROM notes");
    for (const note of notes)
      await client.query(
        `INSERT INTO notes (id,title,content,tags,folder,due_at,created_at,updated_at,favorite,archived,pinned,deleted,protected,encrypted_content,recovery_encrypted_content,color)
      VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content,tags=EXCLUDED.tags,folder=EXCLUDED.folder,due_at=EXCLUDED.due_at,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at,favorite=EXCLUDED.favorite,archived=EXCLUDED.archived,pinned=EXCLUDED.pinned,deleted=EXCLUDED.deleted,protected=EXCLUDED.protected,encrypted_content=EXCLUDED.encrypted_content,recovery_encrypted_content=EXCLUDED.recovery_encrypted_content,color=EXCLUDED.color`,
        [
          note.id,
          note.title,
          note.protected ? "" : note.content,
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
        ],
      );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
