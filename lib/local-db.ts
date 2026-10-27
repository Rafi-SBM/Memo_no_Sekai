/**
 * File-backed memo store for local development.
 *
 * Only reachable when `storeStatus()` returns `sqlite`, which never happens on a
 * serverless deployment: that filesystem is read-only and per-invocation, so a
 * write here would be silently lost.
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { redactProtected, type Note } from "./memo";

const databasePath = () =>
  process.env.MEMO_SQLITE_PATH?.trim() || path.join(process.cwd(), "data", "memo-no-sekai.sqlite");

let database: Database.Database | undefined;

/** Columns added after the first release; each is applied once, if missing. */
const migrations = [
  "ALTER TABLE notes ADD COLUMN protected INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE notes ADD COLUMN created_at TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE notes ADD COLUMN encrypted_content TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE notes ADD COLUMN folder TEXT NOT NULL DEFAULT 'inbox'",
  "ALTER TABLE notes ADD COLUMN due_at TEXT",
  "ALTER TABLE notes ADD COLUMN recovery_encrypted_content TEXT NOT NULL DEFAULT ''",
];

const indexes = [
  "CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes (updated_at DESC)",
  "CREATE INDEX IF NOT EXISTS notes_due_at_idx ON notes (due_at)",
  "CREATE INDEX IF NOT EXISTS notes_deleted_archived_idx ON notes (deleted, archived)",
  "CREATE INDEX IF NOT EXISTS notes_folder_idx ON notes (folder)",
];

function getDatabase() {
  if (database) return database;
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  database = new Database(file);
  database.pragma("journal_mode = WAL");
  database.exec(`CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    folder TEXT NOT NULL DEFAULT 'inbox',
    due_at TEXT,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    pinned INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    protected INTEGER NOT NULL DEFAULT 0,
    encrypted_content TEXT NOT NULL DEFAULT '',
    recovery_encrypted_content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'yellow'
  )`);
  for (const migration of migrations) {
    try {
      database.exec(migration);
    } catch {
      /* the column already exists */
    }
  }
  for (const index of indexes) database.exec(index);
  return database;
}

function toNote(row: Record<string, unknown>): Note {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(String(row.tags || "[]"));
    if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    /* a hand-edited row; treat it as untagged rather than failing the read */
  }
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    tags,
    folder: String(row.folder || "inbox"),
    dueAt: row.due_at ? String(row.due_at) : undefined,
    createdAt: String(row.created_at || row.updated_at),
    updatedAt: String(row.updated_at),
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

export function listNotes(): Note[] {
  return getDatabase()
    .prepare("SELECT * FROM notes ORDER BY updated_at DESC")
    .all()
    .map((row) => toNote(row as Record<string, unknown>));
}

/**
 * Writes memos in one transaction. With `replace`, memos absent from `notes`
 * are removed, which is how a permanent delete reaches the store.
 */
export function upsertNotes(notes: Note[], replace = false) {
  const db = getDatabase();
  const statement = db.prepare(
    `INSERT INTO notes (id,title,content,tags,folder,due_at,created_at,updated_at,favorite,archived,pinned,deleted,protected,encrypted_content,recovery_encrypted_content,color)
     VALUES (@id,@title,@content,@tags,@folder,@dueAt,@createdAt,@updatedAt,@favorite,@archived,@pinned,@deleted,@protected,@encryptedContent,@recoveryEncryptedContent,@color)
     ON CONFLICT(id) DO UPDATE SET title=@title,content=@content,tags=@tags,folder=@folder,due_at=@dueAt,created_at=@createdAt,updated_at=@updatedAt,favorite=@favorite,archived=@archived,pinned=@pinned,deleted=@deleted,protected=@protected,encrypted_content=@encryptedContent,recovery_encrypted_content=@recoveryEncryptedContent,color=@color`,
  );

  // Protected plaintext must not reach the store even if a client sent it.
  const safeNotes = redactProtected(notes);

  const transaction = db.transaction((items: Note[]) => {
    if (replace && !items.length) db.prepare("DELETE FROM notes").run();
    else if (replace) {
      const placeholders = items.map(() => "?").join(",");
      db.prepare(`DELETE FROM notes WHERE id NOT IN (${placeholders})`).run(...items.map((note) => note.id));
    }
    for (const note of items)
      statement.run({
        ...note,
        tags: JSON.stringify(note.tags),
        folder: note.folder || "inbox",
        dueAt: note.dueAt || null,
        createdAt: note.createdAt || note.updatedAt,
        updatedAt: note.updatedAt,
        favorite: Number(Boolean(note.favorite)),
        archived: Number(Boolean(note.archived)),
        pinned: Number(Boolean(note.pinned)),
        deleted: Number(Boolean(note.deleted)),
        protected: Number(Boolean(note.protected)),
        encryptedContent: note.encryptedContent || "",
        recoveryEncryptedContent: note.recoveryEncryptedContent || "",
      });
  });
  transaction(safeNotes);
}

export function clearDatabase() {
  getDatabase().prepare("DELETE FROM notes").run();
}
