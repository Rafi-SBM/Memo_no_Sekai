/**
 * Talks to `/api/notes`.
 *
 * A deployment without a configured store answers 501, and one with the wrong
 * sync passphrase answers 401. Both mean "keep this workspace on the device",
 * which is a normal mode rather than an error, so they are reported separately
 * from a genuine network failure.
 */

import { readPref, removePref, writePref } from "./client-store";
import type { Note } from "./memo";

const passphraseKey = "memo-sync-passphrase";

export type SyncTarget =
  /** A server store is reachable and authorised. */
  | { kind: "server" }
  /** No server store exists for this deployment; the device is the only home. */
  | { kind: "device" }
  /** A server store exists but the passphrase is missing or wrong. */
  | { kind: "locked" };

export const readPassphrase = () => readPref(passphraseKey) || "";

export function writePassphrase(value: string) {
  const trimmed = value.trim();
  if (trimmed) writePref(passphraseKey, trimmed);
  else removePref(passphraseKey);
}

function authHeaders(): HeadersInit {
  const passphrase = readPassphrase();
  return passphrase ? { Authorization: `Bearer ${passphrase}` } : {};
}

/** Distinguishes a deliberate refusal from an unreachable server. */
function classify(status: number): SyncTarget {
  if (status === 501) return { kind: "device" };
  if (status === 401) return { kind: "locked" };
  return { kind: "server" };
}

/**
 * Asks the server what it can do and, when it has a store, what it holds.
 *
 * `notes` is null whenever the caller should fall back to the device copy.
 */
export async function probeServer(signal?: AbortSignal): Promise<{
  target: SyncTarget;
  notes: Note[] | null;
  reachable: boolean;
}> {
  try {
    const response = await fetch("/api/notes", {
      headers: authHeaders(),
      cache: "no-store",
      signal,
    });
    if (!response.ok) return { target: classify(response.status), notes: null, reachable: true };
    const payload = (await response.json()) as { notes?: Note[] };
    return { target: { kind: "server" }, notes: payload.notes ?? [], reachable: true };
  } catch {
    // Offline, or served as a static build with no API at all.
    return { target: { kind: "device" }, notes: null, reachable: false };
  }
}

export type PushResult = "saved" | "offline" | "device" | "locked";

/** Replaces the server workspace with `notes`. */
export async function pushWorkspace(notes: Note[]): Promise<PushResult> {
  try {
    const response = await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ notes }),
      cache: "no-store",
    });
    if (response.ok) return "saved";
    if (response.status === 501) return "device";
    if (response.status === 401) return "locked";
    return "offline";
  } catch {
    return "offline";
  }
}
