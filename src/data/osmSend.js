// Sends an edit to OpenStreetMap and records it; with no internet, keeps it in a queue and sends it later.
// A job is { kind: "tags", wayId, wanted, comment } or { kind: "create", items, comment, source }.
import { isLoggedIn } from "./osmAuth.js";
import { addMissingTags, createBuildings } from "./osmEdit.js";
import { addHistory } from "./history.js";

const KEY = "osm_queue";
export const getQueue = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
const saveQueue = q => { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) { /* cannot save */ } };

// Does the edit now. Returns what was added (tags) or how many buildings were made.
async function run(job) {
  if (job.kind === "tags") {
    const r = await addMissingTags(job.wayId, job.wanted, job.comment);
    if (Object.keys(r.added).length) addHistory({ kind: "tags", wayId: job.wayId, added: r.added, cs: r.cs, version: r.version });
    return r.added;
  }
  const r = await createBuildings(job.items, job.comment, job.source);
  addHistory({ kind: "create", ways: r.ways, cs: r.cs });
  return r.ways.length;
}

// fetch throws a TypeError when there is no connection at all.
const offline = e => !navigator.onLine || e instanceof TypeError;

// Returns { queued: true } if it was saved for later, otherwise { result }.
export async function sendOrQueue(job) {
  try { return { result: await run(job) }; } catch (e) {
    if (!offline(e)) throw e;
    saveQueue([...getQueue(), job]);
    return { queued: true };
  }
}

// Sends everything waiting in the queue. Returns { sent, failed } counts.
let flushing = false;
export async function flushQueue() {
  const done = { sent: 0, failed: 0 };
  if (flushing || !isLoggedIn() || !navigator.onLine) return done;
  flushing = true;
  try {
    for (const job of getQueue()) {
      try { await run(job); done.sent++; } catch (e) { if (offline(e)) break; done.failed++; } // a lost connection waits; a refused edit is dropped
      saveQueue(getQueue().slice(1));
    }
  } finally { flushing = false; }
  return done;
}
