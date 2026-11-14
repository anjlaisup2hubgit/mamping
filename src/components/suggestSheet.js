// The panel for one missing building (AI-drawn or drawn by you): fix its shape, name it and submit it, or remove it.
// b = {coords, center, confidence}; the user may still drag its corners.
import { sendContribution } from "../data/api.js";
import { $ } from "./dom.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmAllowed } from "./osmConfirm.js";
import { removeBox } from "./missingLayer.js";
import { sendOrQueue } from "../data/osmSend.js";
import { overlapsExisting } from "../data/buildings.js";
import "./shapeTools.js"; // the Rectangle / Undo / Not a building buttons float next to the shape

export function showSuggestion(b) {
  const from = b.from ? `Outline from ${b.from}. ` : b.confidence ? `AI ${Math.round(b.confidence * 100)}% sure. ` : "";
  openSheet(`<input type="text" id="sn" class="sname" placeholder="✎ Name (optional)" aria-label="Name">
    <label class="okTick" data-tip="I checked this against the picture"><input type="checkbox" id="osmOk"> Checked</label>
    <button class="primary pill" id="toOsm">Add to OSM</button>
    <button class="round" id="moreB" aria-label="More" data-tip="More">⋯</button>
    <div class="rwide moreMenu" id="moreM" hidden>
      <p class="mid" style="margin:0;font-size:13px">${from}Drag orange dots to fit the roof. Drag a white dot to add a corner; double-tap an orange dot to remove it. Drag the middle handle to move it all.</p>
      <button class="ghost pill" id="subO">Save outline</button>
    </div>`, true);
  $("#moreB").onclick = () => { $("#moreM").hidden = !$("#moreM").hidden; };
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
