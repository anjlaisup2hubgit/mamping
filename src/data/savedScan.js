// Save drafts locally first, then sync to their verified OpenStreetMap account.
import { isLoggedIn, accountName } from "./osmAuth.js";
import { getScan, putScan } from "./api.js";
import { storageScope, readStored, writeStored, removeStored, migrateGuest, unverifiedScope } from "./accountStorage.js";
import { setSaveStatus } from "./saveStatus.js";

const KEY = "missing_scan", UNSENT = "missing_scan_unsent";
const plain = list => list.map(b => ({
  id: b.id, coords: b.coords, center: b.center, confidence: b.confidence, from: b.from,
  keep: b.keep !== false, reviewed: b.reviewed === true, tags: { ...(b.tags || {}) },
  shapePast: (b.shapePast || []).slice(-50), shapeFuture: (b.shapeFuture || []).slice(-50)
}));
const wait = ms => new Promise(ok => setTimeout(ok, ms));
const local = scope => {
  const list = readStored(KEY, [], scope);
  if (!Array.isArray(list)) throw new Error("Saved outlines could not be read; their copy has been kept.");
  return list;
};
const unsent = scope => readStored(UNSENT, false, scope);
const mark = (scope, value) => writeStored(UNSENT, value, scope);

// One sender per account. Changes made during a send are picked up by the next pass.
const senders = new Map();
function send(scope) {
  if (senders.has(scope)) { senders.get(scope).again = true; return senders.get(scope).promise; }
  const task = { again: false };
  task.promise = (async () => {
    do {
      task.again = false;
      if (storageScope() !== scope || !isLoggedIn()) throw new Error("The account changed; outlines stay saved for their original account.");
      for (let i = 0; ; i++) {
        try { await putScan(local(scope)); break; }
        catch (e) { if (/401|403/.test(e.message) || i === 2 || storageScope() !== scope) throw e; await wait(1000 * 3 ** i); }
      }
    } while (task.again);
    mark(scope, false);
    if (storageScope() === scope) setSaveStatus("saved", "Saved on this device and your account");
  })().catch(e => {
    if (storageScope() === scope) setSaveStatus("pending", "Saved on this device; account sync needs retry: " + e.message);
    throw e;
  }).finally(() => senders.delete(scope));
  senders.set(scope, task);
  return task.promise;
}

function claimLocal(scope) {
  if (local(scope).length) return local(scope);
  // An offline session can acquire its verified ID later without losing that same session's drafts.
  const temporary = unverifiedScope();
  const source = temporary; // Only drafts from this same authenticated session may be claimed automatically.
  const drafts = local(source);
  if (drafts.length) {
    writeStored(KEY, drafts, scope);
    mark(scope, true);
    removeStored(KEY, source);
  }
  return drafts;
}

export async function loadScan() {
  try {
    migrateGuest(KEY);
    if (isLoggedIn() && storageScope().startsWith("unverified:")) await accountName();
    const scope = storageScope();
    if (scope === "guest" || scope.startsWith("unverified:")) return local(scope);
    const drafts = local(scope);
    if (unsent(scope)) { send(scope).catch(() => {}); return drafts; }
    try {
      const saved = await getScan();
      if (storageScope() !== scope) return local(storageScope());
      if (!Array.isArray(saved)) throw new Error("Invalid saved outlines response");
      if (!saved.length) {
        const kept = drafts.length ? drafts : claimLocal(scope);
        if (kept.length) { mark(scope, true); send(scope).catch(() => {}); }
        return kept;
      }
      writeStored(KEY, plain(saved), scope);
      setSaveStatus("saved", "Saved on this device and your account");
      return saved;
    } catch (e) {
      setSaveStatus("pending", "Using the device copy; account sync is unavailable");
      return drafts.length ? drafts : claimLocal(scope);
    }
  } catch (e) { setSaveStatus("failed", e.message); throw e; }
}

export async function saveScan(list) {
  const scope = storageScope();
  let deviceSaved = false;
  try {
    setSaveStatus("saving", "Saving outlines…");
    writeStored(KEY, plain(list), scope);
    deviceSaved = true;
    if (scope === "guest" || scope.startsWith("unverified:")) {
      setSaveStatus("saved", "Saved on this device");
      return;
    }
    mark(scope, true);
    setSaveStatus("pending", "Saved on this device; syncing your account…");
    return await send(scope);
  } catch (e) {
    setSaveStatus(deviceSaved ? "pending" : "failed", deviceSaved ? "Saved on this device; account sync needs retry: " + e.message : e.message);
    throw e;
  }
}

export async function retryScanSync() {
  const scope = storageScope();
  if (isLoggedIn() && scope.startsWith("osm:")) return send(scope);
}
export function unassignedDraftCount() {
  try { migrateGuest(KEY); return storageScope() === "guest" ? 0 : local("guest").length; }
  catch (e) { setSaveStatus("failed", e.message); return 0; }
}
export async function importUnassignedDrafts() {
  if (storageScope().startsWith("unverified:")) await accountName();
  const scope = storageScope();
  if (!scope.startsWith("osm:")) throw new Error("Connect and verify your OpenStreetMap account first.");
  const current = local(scope), incoming = local("guest");
  const key = b => b.id || JSON.stringify(b.coords);
  const merged = current.concat(incoming.filter(b => !current.some(c => key(c) === key(b))));
  writeStored(KEY, plain(merged), scope);
  mark(scope, true);
  removeStored(KEY, "guest");
  send(scope).catch(() => {});
}
addEventListener("online", () => { const scope = storageScope(); if (isLoggedIn() && scope.startsWith("osm:") && unsent(scope)) send(scope).catch(() => {}); });

// Account copies stay on this device when logging out; the next account uses a different key.
export const clearLocalScan = () => { setSaveStatus("saved", "Your account's drafts were kept on this device"); };
