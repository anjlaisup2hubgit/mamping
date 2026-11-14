// The panel for one missing building (AI-drawn or drawn by you): fix its shape, name it and submit it, or remove it.
// b = {coords, center, confidence}; the user may still drag its corners.
import { sendContribution } from "../data/api.js";
import { $ } from "./dom.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { sendOrQueue } from "../data/osmSend.js";
import { overlapsExisting } from "../data/buildings.js";
import { squareShape, undoShape } from "./cornerEditor.js";
import { removeBox } from "./missingLayer.js";

export function showSuggestion(b) {
  openSheet(`<div><h2>Missing building</h2><p class="mid" style="margin:4px 0 0">Drag the orange dots to fit the roof${b.from ? ` · outline from ${b.from}` : b.confidence ? ` · AI ${Math.round(b.confidence * 100)}% sure` : ""}</p>
    <p class="mid" style="margin:4px 0 0;font-size:13px">Drag a white dot to add a corner. Double-tap an orange dot to remove it. Drag the middle handle to move the whole shape.</p></div>
    <div class="row"><button class="ghost show" id="sqB">Make it a rectangle</button><button class="ghost show" id="unB">Undo</button><button class="ghost show" id="rmB">Not a building</button></div>
    <div><label for="sn">Name</label><input type="text" id="sn" placeholder="What is it?"></div>
    ${osmConfirm()}<button class="big primary" id="toOsm" style="min-height:48px">Add building to OpenStreetMap</button><div class="row"><button class="big ghost" id="subO" style="min-height:48px">Save outline</button></div>`);
  $("#sqB").onclick = squareShape;
  $("#unB").onclick = () => { if (!undoShape()) toast("Nothing to undo."); };
  $("#rmB").onclick = () => { removeBox(b); closeSheet(); toast("Box removed"); };
  let warned = false; // the overlap warning shows once; tapping again adds anyway
  $("#toOsm").onclick = async () => {
    if (!osmAllowed()) return;
    if (overlapsExisting(b.coords) && !warned) { warned = true; return toast("This overlaps a building already on the map. Fix the corners, or tap again to add anyway."); }
    $("#toOsm").disabled = true; // no double send
    try {
      const r = await sendOrQueue({ kind: "create", items: [{ corners: b.coords, tags: { name: $("#sn").value.trim() } }],
        source: [b.from, "Esri World Imagery"].filter(Boolean).join("; "),
        comment: b.from ? `Add missing building from ${b.from}, checked against satellite imagery` : "Add missing building traced from satellite imagery" });
      toast(r.queued ? "No internet. It will be sent when you are back online." : "Building added to OpenStreetMap");
      removeBox(b); // it is on the map now, so the orange box has done its job
      closeSheet();
    } catch (e) { $("#toOsm").disabled = false; toast("Could not reach OpenStreetMap: " + e.message); }
  };
  $("#subO").onclick = async () => {
    try {
      await sendContribution({ kind: "outline", lat: b.center[0], lng: b.center[1], name: $("#sn").value, polygon: b.coords });
      toast("Outline submitted");
      closeSheet();
    } catch (e) { toast("Could not submit"); }
  };
}
