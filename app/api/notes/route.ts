import { NextResponse } from "next/server";
import { limits, type Note } from "../../../lib/memo";
import {
  bearerToken,
  listNotes,
  replaceNotes,
  storeStatus,
  tokenMatches,
  upsertNotes,
} from "../../../lib/server-store";
import { isValidNote } from "../../../lib/validate-note";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Memo text must never be cached by a proxy or the browser. */
const privateJson = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" },
  });

/**
 * Resolves the active store and authorises the caller.
 *
 * Returns either a usable mode or the response to send back. When no store is
 * configured this is a 501, which the browser treats as "stay on this device"
 * rather than as an error worth retrying.
 */
async function resolveStore(request: Request) {
  const status = storeStatus();
  if (status.mode === "disabled")
    return {
      response: privateJson({ error: "Server store is not configured", detail: status.reason }, 501),
    } as const;

  if (!(await tokenMatches(bearerToken(request))))
    return { response: privateJson({ error: "Invalid sync passphrase" }, 401) } as const;

  return { mode: status.mode } as const;
}

/** Reads the body with a hard size ceiling, before handing anything to JSON.parse. */
async function readBody(request: Request): Promise<{ value: unknown } | { response: NextResponse }> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > limits.requestBody)
    return { response: privateJson({ error: "Request body is too large" }, 413) };

  const text = await request.text();
  if (text.length > limits.requestBody)
    return { response: privateJson({ error: "Request body is too large" }, 413) };

  try {
    return { value: JSON.parse(text) as unknown };
  } catch {
    return { response: privateJson({ error: "Request body is not valid JSON" }, 400) };
  }
}

export async function GET(request: Request) {
  const store = await resolveStore(request);
  if ("response" in store) return store.response;
  try {
    return privateJson({ notes: await listNotes(store.mode), mode: store.mode });
  } catch (error) {
    console.error("Failed to load notes", error);
    return privateJson({ error: "Could not load notes" }, 500);
  }
}

/** Replaces the stored workspace exactly, including removing deleted memos. */
export async function PUT(request: Request) {
  const store = await resolveStore(request);
  if ("response" in store) return store.response;

  const body = await readBody(request);
  if ("response" in body) return body.response;

  const notes = (body.value as { notes?: unknown } | null)?.notes;
  if (!Array.isArray(notes)) return privateJson({ error: "notes must be an array" }, 400);
  if (!notes.every(isValidNote)) return privateJson({ error: "notes contain an invalid record" }, 400);

  const ids = new Set((notes as Note[]).map((note) => note.id));
  if (ids.size !== notes.length) return privateJson({ error: "notes contain duplicate ids" }, 400);

  try {
    await replaceNotes(store.mode, notes as Note[]);
    return privateJson({ notes: await listNotes(store.mode), mode: store.mode });
  } catch (error) {
    console.error("Failed to save notes", error);
    return privateJson({ error: "Could not save notes" }, 500);
  }
}

/** Upserts a single memo without touching the rest of the workspace. */
export async function POST(request: Request) {
  const store = await resolveStore(request);
  if ("response" in store) return store.response;

  const body = await readBody(request);
  if ("response" in body) return body.response;

  if (!isValidNote(body.value)) return privateJson({ error: "invalid note" }, 400);
  const note = body.value;

  try {
    await upsertNotes(store.mode, [note]);
    const stored = await listNotes(store.mode);
    return privateJson({ note: stored.find((item) => item.id === note.id), mode: store.mode });
  } catch (error) {
    console.error("Failed to save note", error);
    return privateJson({ error: "Could not save note" }, 500);
  }
}
