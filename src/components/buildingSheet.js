// The panel for a tapped building: details, videos, comments, share.
import { state } from "../data/state.js";
import { heightOf } from "../data/buildings.js";
import { fetchBuildingById } from "../data/overpass.js";
import { $, esc } from "./dom.js";
import { map, centerOn } from "./mapView.js";
import { refreshStyles, loadBuildings } from "./buildingLayer.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { preview3d } from "./preview3d.js";
import { icons } from "./icons.js";
import { go } from "./router.js";

const clear = () => { if (state.drawing || state.picking) return; state.selectedId = null; refreshStyles(); closeSheet(); }; // map taps are corners while drawing

export function initSheet() { map.on("click", clear); }

const note = c => `<div class="note"><span class="tag">${c.sent ? "Shared" : "Private"}</span> ${esc(c.comment || "Video " + c.secs + "s")} <span class="mid">· ${esc(c.at)}</span>${c.videoUrl ? `<video src="${esc(c.videoUrl)}" controls playsinline preload="none" style="width:100%;border-radius:10px;margin-top:8px"></video>` : ""}</div>`;

export function showBuilding(id) {
  state.selectedId = id;
  refreshStyles();
  const b = state.buildings.get(id);
  if (!b) return;
  // Slide the building to the middle of the part of the map the panel leaves visible.
  // A tilted/turned map has no flat pixel grid, so there we just centre it.
  if (map.getContainer().classList.contains("tilted")) map.setView(b.center, map.getZoom());
  else { const p = map.latLngToContainerPoint(b.center), s = map.getSize(); map.panBy([p.x - s.x / 2, p.y - innerHeight * 0.2]); }
  const notes = state.contribs.filter(c => c.buildingId === id);
  const h = heightOf(b);
  const link = location.href.split("#")[0] + "#b" + id;
  openSheet(`<span class="tag">${h || b.levels ? "Mapped details" : "Needs details"}</span><div><span class="eyebrow">Building details</span><h2>${esc(b.name || "Unnamed building")}</h2>${b.addr ? `<p class="mid">${esc(b.addr)}</p>` : ""}</div>
    <div class="buildingFacts"><div><span>Height</span><strong>${h ? esc(h) + " m" : "—"}</strong></div><div><span>Floors</span><strong>${b.levels ? esc(b.levels) : "—"}</strong></div></div>
    ${h || b.levels ? `<div class="buildingPreview">${preview3d({ coords: b.coords, height: h, levels: b.levels })}</div>` : '<p class="mid" style="margin:0">Capture this building to help add its height and floors.</p>'}
    ${notes.length ? notes.map(note).join("") : '<p class="mid" style="margin:0">No contributions yet.</p>'}
    <button class="big primary" id="captureDetails">${icons.camera} Capture details</button><button class="big ghost" id="shareB" style="min-height:44px">Share building link</button>`);
  $("#captureDetails").onclick = () => { closeSheet(); go("camera"); };
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
