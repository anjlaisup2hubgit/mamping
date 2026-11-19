// The panel for a tapped building: type in missing details right here, see videos, or film it.
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
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { sendOrQueue } from "../data/osmSend.js";
import { number } from "./detailsFields.js";

const clear = () => { if (state.drawing || state.picking) return; state.selectedId = null; refreshStyles(); closeSheet(); }; // map taps are corners while drawing

export function initSheet() { map.on("click", clear); }

const note = c => `<div class="note"><span class="tag">${c.sent ? "Shared" : "Private"}</span> ${esc(c.comment || "Video " + c.secs + "s")} <span class="mid">· ${esc(c.at)}</span>${c.videoUrl ? `<video src="${esc(c.videoUrl)}" controls playsinline preload="none" style="width:100%;border-radius:10px;margin-top:8px"></video>` : ""}</div>`;

// One box in the panel. A value OpenStreetMap already has is shown but locked: the app only adds missing details.
const field = (id, label, value, mode) =>
  `<div style="flex:1"><label for="${id}">${label}</label><input type="text" id="${id}" inputmode="${mode}" value="${esc(value ?? "")}"${value ? ' readonly style="background:transparent;border-color:transparent;padding-left:0"' : ' placeholder="Add"'}></div>`;

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
  openSheet(`<span class="tag">${h || b.levels ? "Mapped details" : "Needs details"}</span><div><span class="eyebrow">Building details</span>${b.addr ? `<p class="mid" style="margin:0">${esc(b.addr)}</p>` : ""}</div>
    ${field("bn", "Name", b.name, "text")}
    <div class="row">${field("bh", "Height (m)", b.ht, "decimal")}${field("bf", "Floors", b.levels, "numeric")}</div>
    <div id="bSave" hidden><div style="display:flex;flex-direction:column;gap:8px">${osmConfirm()}<button class="big primary" id="saveB">Save to OpenStreetMap</button></div></div>
    ${h || b.levels ? `<div class="buildingPreview">${preview3d({ coords: b.coords, height: h, levels: b.levels })}</div>` : ""}
    ${notes.length ? notes.map(note).join("") : ""}
    <button class="big ghost" id="captureDetails" style="min-height:44px">${icons.camera} Capture details</button>
    <p class="mid" style="margin:0;text-align:center;font-size:13px">Tap the map to close</p>`);
  $("#bsheet .x").remove(); // tapping the map closes this panel
  const boxes = ["#bn", "#bh", "#bf"].map(s => $(s)).filter(i => !i.readOnly);
  boxes.forEach(i => { i.oninput = () => { $("#bSave").hidden = !boxes.some(x => x.value.trim()); }; });
  $("#saveB").onclick = () => saveDetails(b);
  $("#captureDetails").onclick = () => { closeSheet(); go("camera"); };
}

// Sends only the boxes that were empty and are now filled in.
async function saveDetails(b) {
  if (!osmAllowed()) return;
  const wanted = { name: $("#bn").readOnly ? "" : $("#bn").value.trim(), height: $("#bh").readOnly ? null : number("#bh"), "building:levels": $("#bf").readOnly ? null : number("#bf") };
  $("#saveB").disabled = true;
  try {
    const r = await sendOrQueue({ kind: "tags", wayId: b.id, wanted, comment: "Add building details" });
    const added = r.result || {};
    if (added.name) b.name = added.name;
    if (added.height) b.ht = +added.height;
    if (added["building:levels"]) b.levels = +added["building:levels"];
    toast(r.queued ? "No internet. These details will be sent when you are back online." : Object.keys(added).length ? "Saved to OpenStreetMap" : "OpenStreetMap already has these details.");
    showBuilding(b.id);
  } catch (e) {
    if ($("#saveB")) $("#saveB").disabled = false;
    toast(e.message);
  }
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
