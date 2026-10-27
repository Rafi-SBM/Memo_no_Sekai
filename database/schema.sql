-- PostgreSQL schema used when DATABASE_URL is configured.
CREATE TABLE IF NOT EXISTS notes (
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
);

CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes (updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_tags_idx ON notes USING GIN (tags);
CREATE INDEX IF NOT EXISTS notes_folder_idx ON notes (folder);
CREATE INDEX IF NOT EXISTS notes_due_at_idx ON notes (due_at);
CREATE INDEX IF NOT EXISTS notes_deleted_archived_idx ON notes (deleted, archived);
