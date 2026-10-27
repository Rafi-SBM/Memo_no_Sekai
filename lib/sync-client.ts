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

const kinds: SyncTarget["kind"][] = ["server", "device", "locked"];

const toTarget = (value: unknown): SyncTarget => ({
  kind: kinds.includes(value as SyncTarget["kind"]) ? (value as SyncTarget["kind"]) : "device",
});

/**
 * Asks the server where this workspace belongs and, when the answer is "here",
 * what it holds.
 *
 * `notes` is null whenever the caller should fall back to the device copy. A
 * store that is simply not configured is reported in the body rather than as a
 * failed request, so the normal case leaves nothing in the browser console.
 */
export async function probeServer(signal?: AbortSignal): Promise<{
  target: SyncTarget;
  notes: Note[] | null;
  reachable: boolean;
}> {
  try {
    const response = await fetch("/api/notes", { headers: authHeaders(), cache: "no-store", signal });
    if (!response.ok) return { target: { kind: "device" }, notes: null, reachable: true };
    const payload = (await response.json()) as { notes?: Note[] | null; mode?: unknown };
    const target = toTarget(payload.mode);
    return { target, notes: target.kind === "server" ? (payload.notes ?? []) : null, reachable: true };
  } catch {
    // Offline, or served without an API at all.
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
