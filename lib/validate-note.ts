/**
 * Validation for memos arriving from outside the app: an API request body or an
 * imported backup file. Shared so the two paths cannot drift apart.
 */

import { isNoteColor, limits, type Note } from "./memo";

const isDateString = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 64 && !Number.isNaN(Date.parse(value));

const optionalFlags = ["favorite", "archived", "pinned", "deleted", "protected"] as const;

/**
 * Strict check used by `/api/notes`. A request containing anything unexpected is
 * rejected whole rather than silently repaired, so a client bug cannot quietly
 * corrupt the stored workspace.
 */
export function isValidNote(value: unknown): value is Note {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<Note>;

  if (typeof note.id !== "string" || !note.id.length || note.id.length > limits.id) return false;
  if (typeof note.title !== "string" || !note.title.trim().length || note.title.length > limits.title)
    return false;
  if (typeof note.content !== "string" || note.content.length > limits.content) return false;
  if (!isNoteColor(note.color)) return false;
  if (!isDateString(note.updatedAt)) return false;
  if (note.createdAt !== undefined && !isDateString(note.createdAt)) return false;
  if (note.dueAt !== undefined && !isDateString(note.dueAt)) return false;

  if (
    !Array.isArray(note.tags) ||
    note.tags.length > limits.tagsPerNote ||
    !note.tags.every((tag) => typeof tag === "string" && tag.length <= limits.tag)
  )
    return false;

  if (note.folder !== undefined && (typeof note.folder !== "string" || note.folder.length > limits.folder))
    return false;

  for (const field of [note.encryptedContent, note.recoveryEncryptedContent])
    if (field !== undefined && (typeof field !== "string" || field.length > limits.encryptedContent))
      return false;

  return optionalFlags.every((flag) => note[flag] === undefined || typeof note[flag] === "boolean");
}

/**
 * Lenient coercion used when importing a backup. Unlike `isValidNote` this
 * repairs what it can and returns null only when there is no usable memo —
 * an export from an older version should still import.
 */
export function coerceImportedNote(raw: unknown, takeId: (candidate?: string) => string): Note | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<Note>;
  if (typeof item.title !== "string" || !item.title.trim()) return null;

  const now = new Date().toISOString();
  const createdAt = isDateString(item.createdAt)
    ? item.createdAt
    : isDateString(item.updatedAt)
      ? item.updatedAt
      : now;
  const updatedAt = isDateString(item.updatedAt) ? item.updatedAt : createdAt;
  const isProtected = item.protected === true;

  const tags = Array.isArray(item.tags)
    ? Array.from(
        new Set(
          item.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
            .filter(Boolean),
        ),
      ).slice(0, limits.tagsPerNote)
    : [];

  return {
    id: takeId(typeof item.id === "string" && item.id.trim() ? item.id.trim() : undefined),
    title: item.title.trim().slice(0, limits.title),
    // A protected memo's plaintext is never present in an export; keep it empty.
    content: isProtected ? "" : typeof item.content === "string" ? item.content.slice(0, limits.content) : "",
    tags: tags.length ? tags : ["inbox"],
    folder:
      typeof item.folder === "string" && item.folder.trim()
        ? item.folder.trim().slice(0, limits.folder)
        : "inbox",
    dueAt: isDateString(item.dueAt) ? new Date(item.dueAt).toISOString() : undefined,
    createdAt,
    updatedAt,
    favorite: item.favorite === true,
    archived: item.archived === true,
    pinned: item.pinned === true,
    // Imports never arrive pre-trashed; otherwise they would land invisibly.
    deleted: false,
    protected: isProtected,
    encryptedContent:
      typeof item.encryptedContent === "string"
        ? item.encryptedContent.slice(0, limits.encryptedContent)
        : undefined,
    recoveryEncryptedContent:
      typeof item.recoveryEncryptedContent === "string"
        ? item.recoveryEncryptedContent.slice(0, limits.encryptedContent)
        : undefined,
    color: isNoteColor(item.color) ? item.color : "yellow",
  };
}
