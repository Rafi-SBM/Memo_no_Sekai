import { NextResponse } from "next/server";
import { listNotes, upsertNotes, type StoredNote } from "../../../lib/local-db";
import { listPostgresNotes, upsertPostgresNotes } from "../../../lib/postgres-db";

export const runtime = "nodejs";

const allowedColors = new Set(["yellow", "blue", "purple", "green", "orange"]);
const optionalBooleanKeys = ["favorite", "archived", "pinned", "deleted", "protected"] as const;

function isStoredNote(value: unknown): value is StoredNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Partial<StoredNote>;
  const validOptionalBooleans = optionalBooleanKeys.every(
    (key) => note[key] === undefined || typeof note[key] === "boolean",
  );
  const validTags =
    Array.isArray(note.tags) &&
    note.tags.length <= 50 &&
    note.tags.every((tag) => typeof tag === "string" && tag.length <= 80);
  const validEncryptedFields = [note.encryptedContent, note.recoveryEncryptedContent].every(
    (field) => field === undefined || (typeof field === "string" && field.length <= 12_000_000),
  );
  const validFolder =
    note.folder === undefined || (typeof note.folder === "string" && note.folder.length <= 100);
  const validDueAt =
    note.dueAt === undefined || (typeof note.dueAt === "string" && !Number.isNaN(Date.parse(note.dueAt)));
  return (
    typeof note.id === "string" &&
    note.id.length > 0 &&
    note.id.length <= 200 &&
    typeof note.title === "string" &&
    note.title.trim().length > 0 &&
    note.title.length <= 500 &&
    typeof note.content === "string" &&
    note.content.length <= 10_000_000 &&
    validTags &&
    validFolder &&
    validDueAt &&
    typeof note.updatedAt === "string" &&
    !Number.isNaN(Date.parse(note.updatedAt)) &&
    typeof note.color === "string" &&
    allowedColors.has(note.color) &&
    validEncryptedFields &&
    validOptionalBooleans
  );
}

export async function GET() {
  try {
    const notes = process.env.DATABASE_URL ? await listPostgresNotes() : listNotes();
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Failed to load notes", error);
    return NextResponse.json({ error: "Could not load notes" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { notes?: StoredNote[] };
    if (!Array.isArray(body.notes))
      return NextResponse.json({ error: "notes must be an array" }, { status: 400 });
    if (!body.notes.every(isStoredNote))
      return NextResponse.json({ error: "notes contain an invalid record" }, { status: 400 });
    if (process.env.DATABASE_URL) await upsertPostgresNotes(body.notes, true);
    else upsertNotes(body.notes, true);
    const notes = process.env.DATABASE_URL ? await listPostgresNotes() : listNotes();
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Failed to save notes", error);
    return NextResponse.json({ error: "Could not save notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StoredNote;
    if (!isStoredNote(body)) return NextResponse.json({ error: "invalid note" }, { status: 400 });
    if (process.env.DATABASE_URL) await upsertPostgresNotes([body]);
    else upsertNotes([body]);
    const notes = process.env.DATABASE_URL ? await listPostgresNotes() : listNotes();
    return NextResponse.json({ note: notes.find((note) => note.id === body.id) });
  } catch (error) {
    console.error("Failed to save note", error);
    return NextResponse.json({ error: "Could not save note" }, { status: 500 });
  }
}
