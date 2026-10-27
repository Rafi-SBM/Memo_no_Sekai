/**
 * Chooses and drives the server-side memo store.
 *
 * Three modes:
 *  - `postgres`  `DATABASE_URL` is set. Used for a deployed instance.
 *  - `sqlite`    Local development with no `DATABASE_URL`. File-backed.
 *  - `disabled`  No store is configured, or one is configured but unprotected
 *                in production. The API then declines and the browser keeps the
 *                workspace on the device instead.
 *
 * `disabled` is the default on a hosted deployment on purpose: `/api/notes` has
 * no per-user identity, so an unauthenticated store would expose one shared
 * workspace to every visitor. Setting `MEMO_ACCESS_TOKEN` turns it on.
 */

import type { Note } from "./memo";

export type StoreMode = "postgres" | "sqlite" | "disabled";

export type StoreStatus = {
  mode: StoreMode;
  /** Set when a store is configured but refused; safe to show to an operator. */
  reason?: string;
};

const isProduction = () => process.env.NODE_ENV === "production";

/** Whether a sync passphrase is configured for this deployment. */
export const accessToken = () => process.env.MEMO_ACCESS_TOKEN?.trim() || "";

export function storeStatus(): StoreStatus {
  const hasPostgres = !!process.env.DATABASE_URL?.trim();

  if (hasPostgres) {
    if (isProduction() && !accessToken())
      return {
        mode: "disabled",
        reason:
          "DATABASE_URL is set but MEMO_ACCESS_TOKEN is not. Set a sync passphrase so the shared store is not world-readable, or remove DATABASE_URL to keep memos on each device.",
      };
    return { mode: "postgres" };
  }

  // The SQLite file store is for local development only. A serverless
  // filesystem is read-only and per-invocation, so it cannot persist anything.
  if (!isProduction() || process.env.MEMO_SQLITE === "1") return { mode: "sqlite" };

  return {
    mode: "disabled",
    reason: "No DATABASE_URL is configured, so memos are kept on each device.",
  };
}

/**
 * Compares two secrets in constant time so a wrong passphrase cannot be
 * recovered by measuring how long the comparison took.
 */
export async function tokenMatches(provided: string | null): Promise<boolean> {
  const expected = accessToken();
  if (!expected) return true;
  if (!provided) return false;
  const { timingSafeEqual, createHash } = await import("node:crypto");
  // Hash first so the comparison operands are always the same length.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

/** Reads the bearer token from a request, if one was supplied. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

type Adapter = {
  list: () => Promise<Note[]>;
  replace: (notes: Note[]) => Promise<void>;
  upsert: (notes: Note[]) => Promise<void>;
};

/**
 * Loads the adapter for the active mode.
 *
 * Both adapters are imported lazily: `pg` and the native `better-sqlite3`
 * binding should never be pulled into a deployment that does not use them.
 */
async function adapter(mode: Exclude<StoreMode, "disabled">): Promise<Adapter> {
  if (mode === "postgres") {
    const store = await import("./postgres-db");
    return {
      list: store.listPostgresNotes,
      replace: (notes) => store.upsertPostgresNotes(notes, true),
      upsert: (notes) => store.upsertPostgresNotes(notes, false),
    };
  }
  const store = await import("./local-db");
  return {
    list: async () => store.listNotes(),
    replace: async (notes) => store.upsertNotes(notes, true),
    upsert: async (notes) => store.upsertNotes(notes, false),
  };
}

export async function listNotes(mode: Exclude<StoreMode, "disabled">) {
  return (await adapter(mode)).list();
}

export async function replaceNotes(mode: Exclude<StoreMode, "disabled">, notes: Note[]) {
  return (await adapter(mode)).replace(notes);
}

export async function upsertNotes(mode: Exclude<StoreMode, "disabled">, notes: Note[]) {
  return (await adapter(mode)).upsert(notes);
}
