// Review whole training scenes; every label change is saved before it can be lost to navigation.
import { header, bindBack } from "../components/header.js";
import { toast } from "../components/toast.js";
import { listTraining } from "../data/trainingApi.js";
import { trainingDraft } from "../data/trainingDrafts.js";
import { trainingCanvas } from "../components/trainingCanvas.js";
import { bindTrain, stopTrain } from "../components/trainButton.js";

const empty = `<div class="empty"><h2>No training pictures</h2><p class="mid">Scan an area, then save complete scenes for training. Include every visible roof before keeping a picture.</p></div>`;
let pics = [], at = 0, drafts = new Map(), histories = new Map(), page = null, closed = false, checking = false;
const reviewed = p => p.status === "kept" || p.status === "dropped";
const beforeLeave = e => {
  if ([...drafts.values()].some(d => { const s = d.state(); return s.dirty && !s.local; })) { e.preventDefault(); e.returnValue = ""; }
};

function showSave() {
  const node = page?.querySelector("#trainingSave"), draft = pics[at] && drafts.get(pics[at].name);
  if (!node || !draft) return;
  const s = draft.state();
  node.dataset.state = s.error || (s.dirty && !s.local) || s.conflict ? "error" : "saved";
  node.textContent = s.conflict ? "This picture changed on the server. A browser draft is still available below."
    : s.error ? `${s.local ? "Draft saved in this browser. " : "Not saved. "}${s.error}`
    : s.saving ? "Saving labels…" : s.dirty ? "Draft saved in this browser; waiting to sync." : "Labels saved";
  const retry = page.querySelector("#retryLabels");
  if (retry) retry.hidden = !s.dirty;
}

async function safeMove(el, i) {
  if (checking) return;
  const draft = pics[at] && drafts.get(pics[at].name);
  if (draft) {
    try { await draft.flush(); }
    catch { if (!draft.state().local) return toast("Labels could not be saved. Retry before leaving this picture."); }
  }
  if (!closed) { at = i; draw(el); }
}

function draw(el) {
  const body = el.querySelector("#train");
  if (!pics.length) { body.innerHTML = empty; return; }
  const p = pics[at], n = pics.filter(reviewed).length, draft = drafts.get(p.name);
  body.innerHTML = `<div class="row" style="align-items:center"><button class="round" id="prev" aria-label="Previous picture">‹</button>
    <span class="rcount" style="text-align:center">${at + 1} / ${pics.length} · <span id="pictureStatus"></span></span>
    <button class="round" id="next" aria-label="Next picture">›</button></div>
    <div class="bar"><i style="width:${n / pics.length * 100}%"></i></div>
    <p id="trainingSave" class="trainingSave" role="status" aria-live="polite"></p>
    <div id="labelCanvas"></div>
    <div class="trainingActions"><button class="ghost big" id="saveDraft">Save draft</button><button class="ghost big" id="drop">Drop</button><button class="primary big" id="keep">Keep and next</button></div>
    <p class="mid" style="font-size:12px;margin:4px 0">Keep only after every roof is labeled and every false box is removed; a checked picture with no roofs is a valid empty scene.</p>
    <div class="trainingActions"><button class="ghost pill" id="retryLabels" hidden>Retry saving</button></div>
    <div id="recoverDraft" hidden><p class="mid">A draft from an older picture version is kept in this browser.</p><button class="ghost pill" id="recoverLabels">Recover old labels</button><button class="ghost pill" id="discardLabels">Discard old draft</button></div>`;
  body.querySelector("#pictureStatus").textContent = p.status === "kept" ? "Checked" : p.status === "dropped" ? "Dropped" : "Needs review";
  trainingCanvas(body.querySelector("#labelCanvas"), p, histories.get(p.name), labels => {
    draft.set(labels); body.querySelector("#pictureStatus").textContent = "Needs review";
  });
  body.querySelector("#prev").onclick = () => safeMove(el, (at + pics.length - 1) % pics.length);
  body.querySelector("#next").onclick = () => safeMove(el, (at + 1) % pics.length);
  const save = async () => { try { await draft.flush(); toast("Draft saved."); } catch (e) { toast(e.message); } };
  body.querySelector("#saveDraft").onclick = save;
  body.querySelector("#retryLabels").onclick = save;
  body.querySelector("#drop").onclick = () => check(el, "dropped");
  body.querySelector("#keep").onclick = () => check(el, "kept");
  const recover = body.querySelector("#recoverDraft");
  recover.hidden = !draft.state().conflict;
  body.querySelector("#recoverLabels").onclick = () => {
    if (confirm("Apply this old draft to the latest picture? Check every roof again before keeping it.")) { draft.recover(); draw(el); }
  };
  body.querySelector("#discardLabels").onclick = () => { draft.discard(); draw(el); };
  showSave();
}

async function check(el, status) {
  if (checking) return;
  checking = true;
  const p = pics[at], draft = drafts.get(p.name);
  el.querySelector("#labelCanvas").inert = true;
  el.querySelectorAll("#prev,#next").forEach(b => { b.disabled = true; });
  el.querySelectorAll(".trainingActions button").forEach(b => { b.disabled = true; });
  try { await draft.mark(status); }
  catch (e) { checking = false; if (!closed) { toast(e.message); draw(el); } return; }
  checking = false;
  if (closed) return;
  const later = pics.findIndex((x, i) => i > at && !reviewed(x)), next = later < 0 ? pics.findIndex(x => !reviewed(x)) : later;
  if (next < 0) toast(`All checked: ${pics.filter(x => x.status === "kept").length} kept.`);
  at = next < 0 ? at : next; draw(el);
  bindTrain(el.querySelector("#trainBox"));
}

export const training = {
  async open(el) {
    closed = false; checking = false; page = el; pics = []; drafts = new Map(); histories = new Map();
    el.classList.add("trainingPage");
    el.innerHTML = header("Training") + `<div class="pad scroll" id="train"><p class="mid">Loading training pictures…</p></div><div class="pad" id="trainBox"></div>`;
    bindBack(el, "settings");
    el.querySelector("[data-back]").addEventListener("click", e => {
      const s = pics[at] && drafts.get(pics[at].name)?.state();
      if (s?.dirty && !s.local) { e.stopImmediatePropagation(); e.preventDefault(); toast("Retry saving your labels before leaving."); }
    }, true);
    addEventListener("beforeunload", beforeLeave);
    try { pics = await listTraining(); }
    catch (e) { el.querySelector("#train").textContent = e.message; bindTrain(el.querySelector("#trainBox")); return; }
    if (closed) return;
    for (const p of pics) {
      histories.set(p.name, { past: [], future: [] });
      drafts.set(p.name, trainingDraft(p, () => { if (!closed) showSave(); }));
    }
    const first = pics.findIndex(p => !reviewed(p));
    at = first < 0 ? 0 : first; draw(el);
    bindTrain(el.querySelector("#trainBox"));
  },
  close() {
    closed = true; removeEventListener("beforeunload", beforeLeave); stopTrain();
    page?.classList.remove("trainingPage");
    for (const draft of drafts.values()) draft.flush().catch(() => {});
    page = null;
  }
};
