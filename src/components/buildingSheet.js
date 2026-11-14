// The panel for a tapped building: details, videos, comments, share.
import { state } from "../data/state.js";
import { heightOf } from "../data/buildings.js";
import { fetchBuildingById } from "../data/overpass.js";
import { $, esc } from "./dom.js";
import { map, centerOn } from "./mapView.js";
import { refreshStyles, loadBuildings } from "./buildingLayer.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";

const clear = () => { if (state.drawing || state.picking) return; state.selectedId = null; refreshStyles(); closeSheet(); }; // map taps are corners while drawing

export function initSheet() { map.on("click", clear); }

const note = c => `<div class="note"><span class="tag">${c.sent ? "Shared" : "Private"}</span> ${esc(c.comment || "Video " + c.secs + "s")} <span class="mid">· ${esc(c.at)}</span>${c.videoUrl ? `<video src="${esc(c.videoUrl)}" controls playsinline preload="none" style="width:100%;border-radius:10px;margin-top:8px"></video>` : ""}</div>`;

export function showBuilding(id) {
  state.selectedId = id;
  refreshStyles();
  const b = state.buildings.get(id);
  if (!b) return;
  const notes = state.contribs.filter(c => c.buildingId === id);
  const h = heightOf(b);
  const link = location.href.split("#")[0] + "#b" + id;
  openSheet(`<div><h2>${esc(b.name || "Unnamed building")}</h2><p class="mid" style="margin:4px 0 0">${h ? h + " m" : "Height unknown"}${b.levels ? " · " + b.levels + " floors" : ""}${b.addr ? " · " + esc(b.addr) : ""}</p></div>
    ${notes.length ? notes.map(note).join("") : '<p class="mid" style="margin:0">No contributions yet.</p>'}
    <div class="row"><button class="big primary" id="shareB" style="min-height:48px">Share</button></div>`);
  $("#shareB").onclick = async () => {
    try { await navigator.clipboard.writeText(link); toast("Link copied"); } catch (e) { toast(link); }
  };
}

// Opens the building named in a shared link like #b12345.
export async function openFromLink() {
  const m = location.hash.match(/^#b(\d+)$/);
  if (!m) return;
  try {
    const b = await fetchBuildingById(+m[1]);
    if (!b) return;
    centerOn(b.center);
    await loadBuildings();
    showBuilding(b.id);
  } catch (e) { /* link is optional */ }
}
