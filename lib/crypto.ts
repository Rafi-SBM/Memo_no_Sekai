/**
 * Password protection for individual memos.
 *
 * Content is encrypted in the browser with AES-GCM under a key derived from the
 * user's password with PBKDF2-SHA256. The password and the derived key are never
 * written to storage and never sent anywhere; only the ciphertext envelope is.
 */

/**
 * Iteration count used for memos protected from now on.
 *
 * Envelopes written before this constant existed have no `iterations` field and
 * are read back with `legacyIterations`, so raising this number never locks a
 * user out of an existing memo.
 */
export const pbkdf2Iterations = 600_000;
const legacyIterations = 120_000;

type Envelope = { salt: string; iv: string; data: string; iterations?: number };

const encodeBase64 = (bytes: Uint8Array) => {
  let binary = "";
  // Chunked so a large memo cannot overflow the argument list.
  for (let index = 0; index < bytes.length; index += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
};

const decodeBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

/** A readable one-time code that can decrypt a memo if its password is lost. */
export const makeRecoveryCode = () => {
  // Omits I, O, 0 and 1 so a written-down code cannot be misread.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return (
    Array.from(bytes, (byte) => alphabet[byte % alphabet.length])
      .join("")
      .match(/.{1,4}/g)
      ?.join("-") || ""
  );
};

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Returns a self-describing JSON envelope holding the salt, IV and ciphertext. */
export async function encryptText(value: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, pbkdf2Iterations);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(value),
  );
  const envelope: Envelope = {
    salt: encodeBase64(salt),
    iv: encodeBase64(iv),
    data: encodeBase64(new Uint8Array(encrypted)),
    iterations: pbkdf2Iterations,
  };
  return JSON.stringify(envelope);
}

/** Throws when the payload is malformed or the password is wrong; callers treat both the same. */
export async function decryptText(payload: string, password: string) {
  const parsed = JSON.parse(payload) as Envelope;
  if (!parsed?.salt || !parsed?.iv || typeof parsed.data !== "string")
    throw new Error("Unreadable protected memo");
  const iterations =
    typeof parsed.iterations === "number" && parsed.iterations > 0 ? parsed.iterations : legacyIterations;
  const key = await deriveKey(password, decodeBase64(parsed.salt), iterations);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(parsed.iv) as BufferSource },
    key,
    decodeBase64(parsed.data) as BufferSource,
  );
  return new TextDecoder().decode(decrypted);
}

/** Web Crypto is required for memo protection; everything else works without it. */
export const canProtectMemos = () =>
  typeof crypto !== "undefined" && typeof crypto.subtle?.deriveKey === "function";
