// Drive results: reads the drive's pictures, then lists the buildings found so you can keep or share them.
import { state } from "../data/state.js";
import { heightOf } from "../data/buildings.js";
import { groupPics, middleOf, matchGroup, addResult } from "../data/driveMatching.js";
import { saveClip } from "../data/store.js";
import { shareClip } from "../data/upload.js";
import { loadContribs } from "../data/contributions.js";
import { $, esc } from "../components/dom.js";
import { go } from "../components/router.js";
import { map, centerOn } from "../components/mapView.js";
import { loadBuildings, refreshStyles } from "../components/buildingLayer.js";
import { toast } from "../components/toast.js";

let alive = false, busy = false, found = new Map();

const progress = (percent, text) => {
  $("#pb").style.width = percent + "%";
  $("#st").textContent = text;
};

async function readDrive(drive) {
  const groups = groupPics(drive.pics);
  let failed = 0, loaded = null; // the map area whose buildings are already loaded
  for (let i = 0; i < groups.length && alive; i++) {
    progress(Math.round(100 * i / groups.length), `Reading pictures ${i * 3 + 1}–${Math.min(i * 3 + 3, drive.pics.length)} of ${drive.pics.length}`);
    const p = middleOf(groups[i]);
    if (!loaded || !loaded.contains([p.lat, p.lng])) { // only fetch buildings again once the road leaves that area
      centerOn([p.lat, p.lng]);
      await loadBuildings().catch(() => {});
      loaded = map.getBounds().pad(-0.2);
    }
    try { const r = await matchGroup(groups[i]); if (r) addResult(found, r); } catch (e) { failed++; }
  }
  return failed === groups.length; // true when the AI never answered
}

const row = ([id, r]) => {
  const h = r.ai.heightM || heightOf(r.b);
  const facts = [r.ai.floors && r.ai.floors + " floors", h && h + " m", Math.round(r.ai.confidence * 100) + "% sure"].filter(Boolean).join(" · ");
  return `<label class="item" style="display:flex;gap:12px;align-items:center"><input type="checkbox" data-id="${id}" checked>
    <span><b>${esc(r.ai.name || r.b.name || "Unnamed building")}</b><br><span class="mid">${facts}</span></span></label>`;
};

function showList(el, drive, aiDown) {
  const list = [...found.entries()];
  el.innerHTML = `<div class="pad scroll" style="padding-top:max(16px,env(safe-area-inset-top))"><h2 style="margin:0">${list.length} building${list.length === 1 ? "" : "s"} found</h2>
    <p class="mid" style="margin:0">${drive.pics.length} pictures. Untick any the AI got wrong. The pictures are deleted after this.</p>
    ${aiDown ? '<p class="note">The AI is unavailable. Check your Gemini key in Settings.</p>' : ""}${list.map(row).join("")}</div>
    <div class="pad" style="padding-bottom:max(18px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;max-width:520px;width:100%;margin:0 auto">
    ${list.length ? '<button class="big primary" id="dUp">Upload ticked</button><button class="big ghost" id="dKeep" style="min-height:48px">Keep ticked offline</button>' : ""}
    <button class="big ghost" id="dDone" style="min-height:48px">${list.length ? "Discard all" : "Back to map"}</button></div>`;
  if (list.length) { $("#dUp").onclick = () => finish(drive, true); $("#dKeep").onclick = () => finish(drive, false); }
  $("#dDone").onclick = () => { state.drive = null; go("map"); };
}

async function finish(drive, send) {
  if (busy) return;
  busy = true;
  const ids = [...document.querySelectorAll("[data-id]:checked")].map(x => +x.dataset.id);
  let sent = 0;
  for (const [i, id] of ids.entries()) {
    const { b, ai, lat, lng } = found.get(id);
    const rec = { id: drive.id + i, secs: drive.secs, track: [{ lat, lng }], at: new Date(drive.id).toLocaleString(), sent: false,
      buildingId: id, name: ai.name || b.name || "", height: ai.heightM || heightOf(b), levels: ai.floors || null,
      comment: "", photo: null, blob: null, videoDeleted: true, fromDrive: true, lat, lng };
    if (send) { try { rec.remoteId = await shareClip(rec); rec.sent = true; sent++; } catch (e) { /* kept on this phone */ } }
    await saveClip(rec).catch(() => {});
  }
  toast(send ? `Sent ${sent} of ${ids.length} to the map` : `Saved ${ids.length} on this phone only`);
  state.drive = null; // the pictures have done their job, so drop them
  await loadContribs();
  refreshStyles();
  busy = false;
  go("map");
}

export const drive = {
  async open(el) {
    alive = true; busy = false; found = new Map();
    const d = state.drive;
    if (!d) return go("map");
    el.innerHTML = `<div class="pad center left"><h2>Reading your drive</h2><div class="bar"><i id="pb"></i></div><p class="mid" id="st" style="margin:0">Starting</p></div>`;
    if (!d.pics.length) return showList(el, d, false);
    const aiDown = await readDrive(d);
    if (alive) showList(el, d, aiDown);
  },
  close() { alive = false; }
};
