/**
 * Browser-side persistence.
 *
 * Memos live in IndexedDB because a workspace with embedded images routinely
 * exceeds the ~5 MB `localStorage` budget, and a `QuotaExceededError` thrown
 * from a save would otherwise take the whole editor down. Small preferences stay
 * in `localStorage`, which is synchronous and survives a failed IndexedDB open.
 *
 * Nothing in this module throws: every entry point reports failure in its
 * return value so the UI can tell the user instead of crashing.
 */

import type { Note } from "./memo";

const databaseName = "memo-no-sekai";
const databaseVersion = 1;
const storeName = "workspace";
const workspaceKey = "notes";
const legacyNotesKey = "memo-notes";

const hasWindow = () => typeof window !== "undefined";

/* ------------------------------------------------------------------ *
 * Preferences (localStorage)
 * ------------------------------------------------------------------ */

/** Reads a string preference, returning null when storage is unavailable. */
export function readPref(key: string): string | null {
  if (!hasWindow()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes a string preference. Returns false when storage rejected the write. */
export function writePref(key: string, value: string): boolean {
  if (!hasWindow()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removePref(key: string) {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* storage is unavailable; nothing to clean up */
  }
}

/**
 * Reads JSON written by `writeJson`. A value that is missing, unparseable or
 * fails `validate` is discarded and `fallback` is returned, so a corrupted
 * entry cannot wedge the app on every subsequent load.
 */
export function readJson<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  const raw = readPref(key);
  if (raw === null) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (validate && !validate(parsed)) {
      removePref(key);
      return fallback;
    }
    return parsed as T;
  } catch {
    removePref(key);
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    return writePref(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Workspace (IndexedDB, with a localStorage fallback)
 * ------------------------------------------------------------------ */

let databasePromise: Promise<IDBDatabase | null> | undefined;

function openDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase | null>((resolve) => {
    if (!hasWindow() || !("indexedDB" in window)) {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = window.indexedDB.open(databaseName, databaseVersion);
    } catch {
      resolve(null);
      return;
    }
    // A private window can leave the open request hanging; do not block startup.
    const timer = window.setTimeout(() => resolve(null), 3000);
    const settle = (value: IDBDatabase | null) => {
      window.clearTimeout(timer);
      resolve(value);
    };
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
    };
    request.onsuccess = () => settle(request.result);
    request.onerror = () => settle(null);
    request.onblocked = () => settle(null);
  });
  return databasePromise;
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  body: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  return openDatabase().then(
    (database) =>
      new Promise<{ ok: true; value: T } | { ok: false; reason: string }>((resolve) => {
        if (!database) {
          resolve({ ok: false, reason: "unavailable" });
          return;
        }
        let request: IDBRequest<T>;
        try {
          request = body(database.transaction(storeName, mode).objectStore(storeName));
        } catch {
          resolve({ ok: false, reason: "unavailable" });
          return;
        }
        request.onsuccess = () => resolve({ ok: true, value: request.result });
        request.onerror = () =>
          resolve({ ok: false, reason: request.error?.name === "QuotaExceededError" ? "quota" : "failed" });
      }),
  );
}

const isNoteArray = (value: unknown): value is Note[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      !!item &&
      typeof item === "object" &&
      typeof (item as Note).id === "string" &&
      typeof (item as Note).title === "string",
  );

/**
 * Loads the saved workspace, preferring IndexedDB and adopting a workspace left
 * behind in `localStorage` by an earlier version. Returns null when this device
 * has never saved one.
 */
export async function loadWorkspace(): Promise<Note[] | null> {
  const result = await runTransaction<unknown>("readonly", (store) => store.get(workspaceKey));
  if (result.ok && isNoteArray(result.value)) return result.value;

  const legacy = readJson<unknown>(legacyNotesKey, null);
  if (isNoteArray(legacy)) {
    // Move it across once so the size ceiling stops applying, then let go of it.
    const moved = await saveWorkspace(legacy);
    if (moved.ok) removePref(legacyNotesKey);
    return legacy;
  }
  return null;
}

export type SaveOutcome =
  | { ok: true; durable: boolean }
  | { ok: false; reason: "quota" | "failed" | "unavailable" };

/**
 * Persists the workspace.
 *
 * `durable: false` means IndexedDB was unavailable and the workspace went to
 * `localStorage` instead, where a large workspace may not fit next time.
 */
export async function saveWorkspace(notes: Note[]): Promise<SaveOutcome> {
  const result = await runTransaction("readwrite", (store) => store.put(notes, workspaceKey));
  if (result.ok) return { ok: true, durable: true };
  if (result.reason === "quota") return { ok: false, reason: "quota" };

  // IndexedDB refused or is missing. localStorage is smaller but better than nothing.
  return writeJson(legacyNotesKey, notes)
    ? { ok: true, durable: false }
    : { ok: false, reason: result.reason === "unavailable" ? "unavailable" : "failed" };
}

/** Forgets every memo stored on this device. Preferences are left alone. */
export async function clearWorkspace(): Promise<boolean> {
  const result = await runTransaction("readwrite", (store) => store.delete(workspaceKey));
  removePref(legacyNotesKey);
  return result.ok;
}

/** Best-effort estimate of how much space this origin is using, for Settings. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!hasWindow() || !navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
