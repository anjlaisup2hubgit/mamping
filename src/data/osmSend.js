// Durable, account-owned submissions. Failed and uncertain sends stay available for review and retry.
import { isLoggedIn, accountName } from "./osmAuth.js";
import { addMissingTags, createBuildings } from "./osmEdit.js";
import { addHistory } from "./history.js";
import { storageScope, readStored, writeStored, migrateGuest } from "./accountStorage.js";
import { setSaveStatus } from "./saveStatus.js";

const KEY = "osm_queue";
const read = scope => {
  const list = readStored(KEY, [], scope);
  if (!Array.isArray(list)) throw new Error("The saved edit queue could not be read; it has been preserved.");
  return list;
};
export function getQueue() {
  try { migrateGuest(KEY); return read(storageScope()); }
  catch (e) { setSaveStatus("failed", e.message); return []; }
}
export function getUnassignedQueue() {
  try { migrateGuest(KEY); return storageScope() === "guest" ? [] : read("guest"); }
  catch (e) { setSaveStatus("failed", e.message); return []; }
}
const save = (list, scope) => { writeStored(KEY, list, scope); notify(); };
const notify = () => { if (typeof dispatchEvent === "function") dispatchEvent(new Event("pending-edits")); };
const offline = () => !navigator.onLine;
const fingerprint = job => JSON.stringify([job.kind, job.wayId, job.wanted, job.items]);
const message = e => String(e.message || e);
const replace = (job, scope) => save(read(scope).map(j => j.queue?.id === job.queue.id ? job : j), scope);
const without = (id, scope) => save(read(scope).filter(j => j.queue?.id !== id), scope);
const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function owner() {
  if (!isLoggedIn()) throw new Error("Connect OpenStreetMap in Settings before sending an edit.");
  if (storageScope().startsWith("unverified:")) await accountName();
  const scope = storageScope();
  if (scope.startsWith("unverified:") || scope === "guest") throw new Error("Your account could not be verified. Reconnect OpenStreetMap; your drafts are still here.");
  return scope;
}

async function run(job, scope) {
  if (job.kind === "tags") {
    const r = await addMissingTags(job.wayId, job.wanted, job.comment);
    if (Object.keys(r.added).length) {
      try { addHistory({ kind: "tags", wayId: job.wayId, added: r.added, cs: r.cs, version: r.version }, scope); }
      catch { setSaveStatus("failed", "The edit was sent, but its history could not be saved."); }
    }
    return r.added;
  }
  const r = await createBuildings(job.items, job.comment, job.source);
  try { addHistory({ kind: "create", ways: r.ways, cs: r.cs }, scope); }
  catch { setSaveStatus("failed", "The edit was sent, but its history could not be saved."); }
  return r.ways;
}

async function send(job, scope) {
  if (storageScope() !== scope) throw new Error("The account changed. These edits were kept for their original account.");
  job = { ...job, queue: { ...job.queue, state: "sending", error: "" } };
  replace(job, scope); // A page closed during sending must not silently send this job again.
  let accepted = false;
  try {
    const result = await run(job, scope);
    accepted = true;
    replace({ ...job, queue: { ...job.queue, state: "sent" } }, scope);
    without(job.queue.id, scope);
    setSaveStatus("saved", "Edit sent to OpenStreetMap");
    return result;
  } catch (e) {
    const uncertain = accepted || e instanceof TypeError;
    const text = accepted ? "OpenStreetMap accepted this edit, but its local receipt could not be saved. Check the map before sending again." : message(e);
    const held = { ...job, queue: { ...job.queue, state: uncertain ? "uncertain" : "failed", error: text } };
    try { replace(held, scope); } catch { /* The durable 'sending' record remains held for review. */ }
    setSaveStatus("failed", text);
    throw new Error(text);
  }
}

export async function sendOrQueue(job) {
  const scope = await owner();
  migrateGuest(KEY);
  const existing = read(scope).find(j => fingerprint(j) === fingerprint(job));
  if (existing) {
    if (existing.queue?.state === "sent") return { queued: false, result: [] };
    throw new Error("This edit is already in Pending edits. Review or retry it there so it is not sent twice.");
  }
  const pending = { ...job, queue: { id: id(), state: "pending", at: Date.now(), error: "" } };
  try { save([...read(scope), pending], scope); }
  catch (e) { setSaveStatus("failed", e.message); throw e; }
  if (offline()) {
    setSaveStatus("pending", "Edit saved on this device; waiting for a connection");
    return { queued: true };
  }
  return { result: await send(pending, scope) };
}

let flushing = false;
export async function flushQueue() {
  const done = { sent: 0, failed: 0 };
  if (flushing || !isLoggedIn() || offline()) return done;
  flushing = true;
  try {
    const scope = await owner();
    for (const job of read(scope)) {
      if (storageScope() !== scope || offline()) break;
      if (job.queue?.state === "sent") { without(job.queue.id, scope); continue; }
      if (job.queue?.state !== "pending") continue; // Failures and interrupted sends require an explicit review.
      try { await send(job, scope); done.sent++; }
      catch (e) { done.failed++; if (/401|403/.test(e.message) || offline()) break; }
    }
  } catch (e) { done.failed++; setSaveStatus("failed", message(e)); }
  finally { flushing = false; }
  return done;
}

export async function retryQueued(jobId) {
  const scope = await owner(), job = read(scope).find(j => j.queue?.id === jobId);
  if (!job) throw new Error("This pending edit is no longer available.");
  if (job.queue.state === "sent") { without(jobId, scope); return { sent: 1, failed: 0 }; }
  replace({ ...job, queue: { ...job.queue, state: "pending", error: "" } }, scope);
  return flushQueue();
}
export async function confirmQueuedSent(jobId) {
  const scope = await owner();
  without(jobId, scope);
  setSaveStatus("saved", "The edit you checked was marked as already on the map");
}

export async function adoptUnassignedQueue() {
  const scope = await owner();
  migrateGuest(KEY);
  const unassigned = read("guest"), current = read(scope);
  const fresh = unassigned.filter(j => !current.some(c => fingerprint(c) === fingerprint(j))).map(j => ({ ...j, queue: { id: id(), state: "uncertain", at: Date.now(), error: "Recovered from an older save. Check the map, then retry." } }));
  save(current.concat(fresh), scope);
  save([], "guest");
  setSaveStatus("pending", "Recovered edits are ready to review in Pending edits");
}
