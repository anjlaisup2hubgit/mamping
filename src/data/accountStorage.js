// Local saves belong to an OpenStreetMap account, never to whichever person logs in next.
import { isLoggedIn, accountStorageId, getToken } from "./osmAuth.js";

export function unverifiedScope() {
  // Only a fingerprint is used in keys; authentication tokens are never copied into saved content or names.
  let a = 2166136261, b = 5381;
  for (const c of getToken() || "") { a = Math.imul(a ^ c.charCodeAt(0), 16777619); b = Math.imul(b, 33) ^ c.charCodeAt(0); }
  return `unverified:${a >>> 0}-${b >>> 0}`;
}
export const storageScope = () => isLoggedIn() ? (accountStorageId() ? "osm:" + accountStorageId() : unverifiedScope()) : "guest";
export const storageKey = (name, scope = storageScope()) => `${name}:${scope}`;
const error = () => new Error("This device could not save your changes. Free some browser storage and try again; keep this page open.");

export function readStored(name, fallback, scope = storageScope()) {
  let raw;
  try { raw = localStorage.getItem(storageKey(name, scope)); }
  catch { throw error(); }
  if (raw === null) return fallback;
  try { return JSON.parse(raw); }
  catch { throw new Error("A saved copy could not be read. It has been kept; do not clear browser storage."); }
}

export function writeStored(name, value, scope = storageScope()) {
  const raw = JSON.stringify(value), key = storageKey(name, scope);
  try {
    localStorage.setItem(key, raw);
    if (localStorage.getItem(key) !== raw) throw error();
  } catch { throw error(); }
}

export function removeStored(name, scope = storageScope()) {
  try { localStorage.removeItem(storageKey(name, scope)); }
  catch { throw error(); }
}

// Older versions did not record an owner. Preserve them as unassigned, not as the next login's work.
export function migrateGuest(name) {
  const raw = localStorage.getItem(name);
  if (raw === null || localStorage.getItem(storageKey(name, "guest")) !== null) return;
  let value;
  try { value = JSON.parse(raw); } catch { return; }
  writeStored(name, value, "guest");
  localStorage.removeItem(name);
}
