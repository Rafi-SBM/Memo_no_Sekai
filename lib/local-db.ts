import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type StoredNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  dueAt?: string;
  createdAt?: string;
  updatedAt: string;
  favorite?: boolean;
  archived?: boolean;
  pinned?: boolean;
  deleted?: boolean;
  protected?: boolean;
  encryptedContent?: string;
  recoveryEncryptedContent?: string;
  color: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "memo-no-sekai.sqlite");
let database: Database.Database | undefined;

function getDatabase() {
  if (database) return database;
  fs.mkdirSync(dataDirectory, { recursive: true });
  database = new Database(databasePath);
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
    recovery_encrypted_content TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'yellow'
  )`);
  try {
    database.exec("ALTER TABLE notes ADD COLUMN protected INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* column already exists */
  }
  try {
    database.exec("ALTER TABLE notes ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
  } catch {
    /* column already exists */
  }
  try {
    database.exec("ALTER TABLE notes ADD COLUMN encrypted_content TEXT NOT NULL DEFAULT ''");
  } catch {
    /* column already exists */
  }
  try {
    database.exec("ALTER TABLE notes ADD COLUMN folder TEXT NOT NULL DEFAULT 'inbox'");
  } catch {
    /* column already exists */
  }
  try {
    database.exec("ALTER TABLE notes ADD COLUMN due_at TEXT");
  } catch {
    /* column already exists */
  }
  try {
    database.exec("ALTER TABLE notes ADD COLUMN recovery_encrypted_content TEXT NOT NULL DEFAULT ''");
  } catch {
    /* column already exists */
  }
  database.exec("CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes (updated_at DESC)");
  database.exec("CREATE INDEX IF NOT EXISTS notes_due_at_idx ON notes (due_at)");
  database.exec("CREATE INDEX IF NOT EXISTS notes_deleted_archived_idx ON notes (deleted, archived)");
  database.exec("CREATE INDEX IF NOT EXISTS notes_folder_idx ON notes (folder)");
  return database;
}

const toNote = (row: Record<string, unknown>): StoredNote => ({
  id: String(row.id),
  title: String(row.title),
  content: String(row.content),
  tags: JSON.parse(String(row.tags)),
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
});

export function listNotes() {
  return getDatabase()
    .prepare("SELECT * FROM notes ORDER BY updated_at DESC")
    .all()
    .map((row) => toNote(row as Record<string, unknown>));
}

export function upsertNotes(notes: StoredNote[], replace = false) {
  const db = getDatabase();
  const statement =
    db.prepare(`INSERT INTO notes (id,title,content,tags,folder,due_at,created_at,updated_at,favorite,archived,pinned,deleted,protected,encrypted_content,recovery_encrypted_content,color)
    VALUES (@id,@title,@content,@tags,@folder,@dueAt,@createdAt,@updatedAt,@favorite,@archived,@pinned,@deleted,@protected,@encryptedContent,@recoveryEncryptedContent,@color)
    ON CONFLICT(id) DO UPDATE SET title=@title,content=@content,tags=@tags,folder=@folder,due_at=@dueAt,created_at=@createdAt,updated_at=@updatedAt,favorite=@favorite,archived=@archived,pinned=@pinned,deleted=@deleted,protected=@protected,encrypted_content=@encryptedContent,recovery_encrypted_content=@recoveryEncryptedContent,color=@color`);
  const transaction = db.transaction((items: StoredNote[]) => {
    if (replace && !items.length) db.prepare("DELETE FROM notes").run();
    else if (replace) {
      const placeholders = items.map(() => "?").join(",");
      db.prepare(`DELETE FROM notes WHERE id NOT IN (${placeholders})`).run(...items.map((note) => note.id));
    }
    items.forEach((note) =>
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
      }),
    );
  });
  transaction(notes);
}

export function clearDatabase() {
  getDatabase().prepare("DELETE FROM notes").run();
}
