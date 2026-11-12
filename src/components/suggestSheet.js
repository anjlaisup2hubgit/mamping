// The panel for an AI-drawn missing building: name it and submit it. b = {coords, center, confidence}; the user may still drag its corners.
import { sendContribution } from "../data/api.js";
import { $ } from "./dom.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { createBuilding } from "../data/osmEdit.js";

export function showSuggestion(b) {
  openSheet(`<div><h2>Missing building</h2><p class="mid" style="margin:4px 0 0">Drag the orange dots to fit the roof${b.confidence ? ` · AI ${Math.round(b.confidence * 100)}% sure` : ""}</p></div>
    <div><label for="sn">Name</label><input type="text" id="sn" placeholder="What is it?"></div>
    ${osmConfirm()}<button class="big primary" id="toOsm" style="min-height:48px">Add building to OpenStreetMap</button><div class="row"><button class="big ghost" id="subO" style="min-height:48px">Save outline</button></div>`);
  $("#toOsm").onclick = async () => {
    if (!osmAllowed()) return;
    try {
      await createBuilding(b.coords, { name: $("#sn").value.trim() }, "Add missing building traced from satellite imagery");
      toast("Building added to OpenStreetMap");
      closeSheet();
    } catch (e) { toast("Could not reach OpenStreetMap: " + e.message); }
  };
  $("#subO").onclick = async () => {
    try {
      await sendContribution({ kind: "outline", lat: b.center[0], lng: b.center[1], name: $("#sn").value, polygon: b.coords });
      toast("Outline submitted");
      closeSheet();
    } catch (e) { toast("Could not submit"); }
  };
}
