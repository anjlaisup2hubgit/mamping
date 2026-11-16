// One building inspector: drafts save as you type; shape tools and details share the same panel.
import { sendContribution } from "../data/api.js";
import { $, esc } from "./dom.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm } from "./osmConfirm.js";
import { currentBoxes, saveBoxes, restyle, unfocus } from "./missingLayer.js";
import { sendChecked } from "./sendChecked.js";
import { validatePolygon } from "../data/geometry.js";
import { detailsFields, bindDetails, readDetails } from "./detailsFields.js";
import { mountShapeTools, placeEditor } from "./shapeTools.js";
import { editIcons as i } from "./editIcons.js";
import { doFix } from "./fixActions.js";
import { getSaveStatus, watchSaveStatus } from "../data/saveStatus.js";

const FIELDS = { rh: "height", rf: "building:levels", rs: "roof:shape", rrh: "roof:height", rwc: "building:colour", rrc: "roof:colour" };
const paintSave = status => {
  const label = document.querySelector(".draftSaveStatus");
  if (label) { label.textContent = status.message; label.dataset.state = status.state; }
};
watchSaveStatus(paintSave);

function readTags(b) {
  const values = readDetails();
  b.tags.name = $("#sn").value.trim();
  for (const [id, tag] of Object.entries(FIELDS)) {
    const input = document.getElementById(id), raw = input.value.trim();
    const numeric = ["rh", "rf", "rrh"].includes(id);
    const valid = !numeric || !raw || (Number.isFinite(Number(raw.replace(",", "."))) && Number(raw.replace(",", ".")) > 0 && (id !== "rf" || Number.isInteger(Number(raw))));
    input.setCustomValidity(valid ? "" : `Enter a positive ${id === "rf" ? "whole number of floors" : "number in metres"}.`);
    if (raw) b.tags[tag] = valid ? values[tag] : raw;
    else delete b.tags[tag];
  }
  if (!b.tags.name) delete b.tags.name;
  b.reviewed = false;
  restyle(); saveBoxes();
}

export function showSuggestion(b) {
  b.tags ||= {};
  const from = b.from ? `Outline from ${b.from}.` : b.confidence ? `AI ${Math.round(b.confidence * 100)}% sure.` : "Drawn by you.";
  openSheet(`<section class="outlineInspector"><div class="editMore" id="editMore" hidden>
      <div class="inspectorStatus"><span class="reviewStatus">${b.reviewed ? "Checked" : "Not checked yet"}</span><span class="draftSaveStatus" role="status"></span></div>
      <div class="editorDetailsFields"><label for="sn">Name (optional)<input type="text" id="sn" class="sname" placeholder="Building name" value="${esc(b.tags.name || "")}"></label>
      ${detailsFields(esc(b.tags.height || ""), esc(b.tags["building:levels"] || ""))}</div>
      <p class="inspectorHelp">${esc(from)} Drag a corner to fit the roof, a white dot to add a corner, or the middle handle to move it. Press ? for keyboard shortcuts.</p>
      <button class="ghost pill" id="subO">Share outline with Mamping</button></div>
    <div class="sendConfirm" id="sendConfirm" hidden>${osmConfirm()}</div>
    <div class="editActions"><button class="ghost" id="edDetails" aria-expanded="false">${i.details}<span>Details</span></button>
      <button class="ghost" id="edRemove" aria-label="Remove">${i.remove}<span>Remove</span></button>
      <button class="primary" id="edKeep">${i.checkNext}<span>Check and next</span></button>
      <button class="ghost" id="toOsm">${i.send}<span>Send ${currentBoxes().filter(o => o.keep && o.reviewed).length} to OSM</span></button></div>
  </section>`, true);
  $("#bsheet").classList.add("editorSheet");
  mountShapeTools();
  $("#bsheet .x").onclick = () => { unfocus(); closeSheet(); };
  paintSave(getSaveStatus());
  for (const [id, tag] of Object.entries(FIELDS)) document.getElementById(id).value = b.tags[tag] ?? "";
  bindDetails(() => readTags(b));
  $("#sn").oninput = () => readTags(b);
  $("#edDetails").onclick = () => { const m = $("#editMore"); m.hidden = !m.hidden; $("#edDetails").setAttribute("aria-expanded", !m.hidden); placeEditor(); };
  $("#edRemove").onclick = () => doFix("remove");
  $("#edKeep").onclick = () => doFix("keep");
  $("#toOsm").onclick = async () => { // sends every checked building, not just this one
    const invalid = $("#bsheet input:invalid");
    if (invalid) return invalid.reportValidity();
    const wasHidden = $("#sendConfirm").hidden;
    const sent = await sendChecked(currentBoxes().filter(o => o.keep && o.reviewed), $("#sendConfirm"), $("#toOsm"));
    if (wasHidden) placeEditor();
    if (sent) closeSheet();
  };
  $("#subO").onclick = async () => {
    const problem = validatePolygon(b.coords);
    if (problem) return toast(problem);
    try {
      await sendContribution({ kind: "outline", lat: b.center[0], lng: b.center[1], name: b.tags.name || "", polygon: b.coords });
      toast("Outline submitted"); closeSheet();
    } catch { toast("Could not submit"); }
  };
}
