// Each picture has a durable browser draft and a serialized server save, so navigation cannot lose labels.
import { writeTraining } from "./trainingApi.js";

const key = p => "training_draft:" + p.name;
const read = p => { try { return JSON.parse(localStorage.getItem(key(p))); } catch { return null; } };
const labelsOf = labels => String(labels || "").trim().split("\n").filter(Boolean).join("\n");

export function trainingDraft(p, changed = () => {}) {
  p.revision = p.revision || 1;
  let sending = null, dirty = false, local = false, error = "", conflict = null;
  const cached = read(p);
  if (cached && cached.baseRevision === p.revision) { p.labels = cached.labels; p.status = ""; dirty = local = true; }
  else if (cached) conflict = cached;
  const state = () => ({ dirty, local, error, conflict, saving: !!sending });
  const tell = () => changed(state());
  const remember = () => {
    try { localStorage.setItem(key(p), JSON.stringify({ labels: p.labels, baseRevision: p.revision })); local = true; }
    catch { local = false; }
  };
  const forget = () => { try { localStorage.removeItem(key(p)); } catch {} local = false; };

  const flush = () => {
    if (sending) return sending;
    if (!dirty) return Promise.resolve();
    sending = (async () => {
      // Edits made during a request wait for its new revision, then save the newest labels.
      while (dirty) {
        const labels = p.labels;
        const saved = await writeTraining({ name: p.name, labels, status: "draft", expectedRevision: p.revision });
        p.revision = saved.revision || p.revision;
        p.status = saved.status || "";
        dirty = p.labels !== labels;
        if (dirty) remember(); else forget();
      }
      error = "";
    })().catch(e => { error = e.message; throw e; }).finally(() => { sending = null; tell(); });
    tell();
    return sending;
  };
  const set = labels => {
    p.labels = labelsOf(labels);
    p.status = "";
    dirty = true; error = "";
    remember(); tell();
    flush().catch(() => {});
  };
  const mark = async status => {
    await flush();
    const saved = await writeTraining({ name: p.name, labels: p.labels, status, expectedRevision: p.revision });
    p.revision = saved.revision || p.revision;
    p.status = saved.status ?? status;
    error = ""; tell();
  };
  const recover = () => { if (conflict) { const labels = conflict.labels; conflict = null; set(labels); } };
  const discard = () => { conflict = null; forget(); tell(); };
  tell();
  return { set, flush, mark, state, recover, discard };
}
