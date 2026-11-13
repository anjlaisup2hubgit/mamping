// The panel listing every AI-drawn missing building: tick the ones you checked and add them together.
import { $ } from "./dom.js";
import { map, liftIntoView } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { createBuildings } from "../data/osmEdit.js";
import { editCorners } from "./cornerEditor.js";

export function showBatch(list, onDone) {
  const rows = list.map((b, i) => `<div class="row" style="align-items:center;justify-content:space-between">
    <label style="display:flex;gap:10px;align-items:center;margin:0"><input type="checkbox" class="pick" data-i="${i}">Building ${i + 1}${b.confidence ? ` · ${Math.round(b.confidence * 100)}% sure` : ""}</label>
    <button class="ghost show" data-i="${i}">Show</button></div>`).join("");
  openSheet(`<div><h2>${list.length} missing building${list.length > 1 ? "s" : ""}</h2><p class="mid" style="margin:4px 0 0">Tick only the ones that match the satellite picture. Tap Show to drag the corners.</p></div>
    <div style="max-height:30vh;overflow:auto">${rows}</div>
    ${osmConfirm()}<button class="big primary" id="addAll" style="min-height:48px">Add ticked buildings to OpenStreetMap</button>`);
  document.querySelectorAll(".show").forEach(b => { b.onclick = () => { const o = list[b.dataset.i]; map.fitBounds(L.polygon(o.coords).getBounds(), { maxZoom: 20 }); editCorners(o); liftIntoView(o.center); }; });
  $("#addAll").onclick = async () => {
    const picked = [...document.querySelectorAll(".pick:checked")].map(c => list[c.dataset.i]);
    if (!picked.length) return toast("Tick at least one building.");
    if (!osmAllowed()) return;
    $("#addAll").disabled = true; // no double send
    try {
      await createBuildings(picked.map(b => ({ corners: b.coords, tags: {} })), "Add missing buildings traced from satellite imagery");
      toast(`${picked.length} building${picked.length > 1 ? "s" : ""} added to OpenStreetMap`);
      closeSheet();
      onDone();
    } catch (e) { $("#addAll").disabled = false; toast("Could not reach OpenStreetMap: " + e.message); }
  };
}
