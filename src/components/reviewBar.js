// Checking the boxes right on the map, with no list in the way. Every box starts kept: tap one to see how sure
// the AI is, double tap to drop it (or bring it back). The buttons at the top change a tap to remove or fix shape. Turn on Select to hold and drag over many boxes at once.
// A slim bar at the bottom counts them and adds the kept ones to OpenStreetMap together.
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { sendOrQueue } from "../data/osmSend.js";
import { overlapsExisting } from "../data/buildings.js";
import { showSentBuildings } from "./buildingLayer.js";
import { inside } from "../data/geo.js";
import { validatePolygon } from "../data/geometry.js";
import { validateBuildingTags } from "../data/buildingTags.js";
import { undoShape } from "./cornerEditor.js";
import { tidy, undoTidy, canUndoTidy } from "./tidyBoxes.js";
import { currentBoxes, removeBoxes, restoreBoxes, restyle, saveBoxes, fixBox, unfocus, drawYourself, scanWithAi, saveForTraining, showSure, hideSure } from "./missingLayer.js";

const MODES = { keep: "Review", fix: "Edit", tidy: "Tidy", remove: "Remove" };
const drawBtn = `<button class="big ghost" id="drawSelf" style="min-height:48px">AI missed one? Draw it yourself</button>`;
const short = from => from.split(" ")[0]; // "Microsoft ML Buildings" -> "Microsoft"
const sourceOf = list => [...new Set(list.map(b => b.from).filter(Boolean)), "Esri World Imagery"].join("; ");
let mode = "keep", chips = null, dragReady = false, selecting = false, undo = []; // undo = the boxes the last remove took off

// A box on the map was tapped.
export function tapBox(b) {
  if (!chips) return showReview(); // the first tap only opens the review, it changes nothing
  if (selecting) return; // in Select, the drag already did it
  if (mode === "fix") return fixBox(b);
  if (mode === "keep") return fixBox(b);
  apply([b]);
}

export const isReviewing = () => !!chips;

// Fix-bar "Remove": takes one box off the map; "Undo remove" brings it back.
export function dropOne(b) { undo = [b]; removeBoxes([b]); showReview(); }

// Tidy: squares the boxes and lines them up with the road.
const tidyThen = async list => {
  try { await tidy(list); list.forEach(b => { b.reviewed = false; }); await saveBoxes(); showReview(); }
  catch (e) { toast(e.message || "Could not tidy these buildings."); }
};

// A box was double tapped: drop it, or bring a dropped one back.
export function doubleTapBox(b) {
  if (chips && !selecting && mode === "keep") { b.keep = !b.keep; b.reviewed = false; restyle(); saveBoxes(); showReview(); }
}

// Check: drops them (or brings them back, if all were dropped already). Remove: takes them off the map.
function apply(list) {
  if (mode === "tidy") return tidyThen(list);
  if (mode === "keep") {
    const on = !list.every(b => b.keep && b.reviewed);
    list.forEach(b => { b.keep = on; b.reviewed = on && !validatePolygon(b.coords) && !validateBuildingTags(b.tags || {}); });
    restyle(); saveBoxes(); undo = [];
  } else { undo = list; removeBoxes(list); }
  showReview();
}

export function stopReview() {
  if (chips) chips.remove();
  chips = null;
  mode = "keep";
  setSelecting(false);
  hideSure();
  unfocus();
}

// The buttons at the top that choose what a tap does.
function showChips() {
  if (!dragReady) { dragReady = true; startSelectDrag(); }
  if (!chips) {
    chips = L.DomUtil.create("div", "modeChips", map.getContainer());
    L.DomEvent.disableClickPropagation(chips); // a tap here is not a tap on the map
    chips.innerHTML = Object.entries(MODES).map(([k, t]) => `<button class="chip" data-mode="${k}">${t}</button>`).join("")
      + `<span class="chipLine"></span><button class="chip sel" id="selB" aria-pressed="false">Select</button>`
      + `<button class="chip chipX" id="chipsX" aria-label="Done checking" data-tip="Done checking">✕</button>`;
    chips.querySelectorAll("[data-mode]").forEach(c => { c.onclick = () => { mode = c.dataset.mode; if (mode === "fix") setSelecting(false); showReview(); }; }); // also brings the bar back after fixing a shape
    chips.querySelector("#selB").onclick = () => { setSelecting(!selecting); if (mode === "fix") mode = "keep"; showReview(); };
    chips.querySelector("#chipsX").onclick = () => { closeSheet(); stopReview(); };
  }
  chips.querySelectorAll("[data-mode]").forEach(c => c.classList.toggle("on", c.dataset.mode === mode));
}

// Select on: the map stops moving, and holding the mouse (or finger) down and dragging over boxes does the tap to each one.
function setSelecting(on) {
  selecting = on;
  if (on) map.dragging.disable(); else map.dragging.enable();
  map.getContainer().classList.toggle("selecting", on);
  const b = chips && chips.querySelector("#selB");
  if (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }
}

function startSelectDrag() {
  let touched = null, turnOn = true; // touched = boxes this drag went over
  const hit = e => {
    const p = map.mouseEventToLatLng(e), pt = [p.lat, p.lng];
    const b = currentBoxes().find(o => !touched.has(o) && inside(pt, o.coords));
    if (!b) return;
    if (!touched.size) turnOn = !(b.keep && b.reviewed); // the first box decides: check all, or drop all
    touched.add(b);
    if (mode === "keep") { b.keep = turnOn; b.reviewed = turnOn && !validatePolygon(b.coords) && !validateBuildingTags(b.tags || {}); restyle(); } else b.shape.setStyle({ opacity: 0.2, fillOpacity: 0 }); // fades until let go
  };
  map.getContainer().addEventListener("pointerdown", e => {
    if (!selecting || e.button !== 0 || e.target.closest(".modeChips")) return;
    touched = new Set();
    hit(e);
  }, true);
  window.addEventListener("pointermove", e => { if (touched) hit(e); });
  window.addEventListener("pointerup", () => {
    if (!touched) return;
    const list = [...touched];
    touched = null;
    if (!list.length) return;
    if (mode === "tidy") return tidyThen(list);
    if (mode === "keep") { saveBoxes(); undo = []; } else { undo = list; removeBoxes(list); }
    showReview();
  });
}

// Ctrl+Z (Cmd+Z on Mac): undo the last shape change, or else bring back the last removed boxes.
document.addEventListener("keydown", e => {
  if (!chips || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  e.preventDefault();
  if (undoShape()) return;
  if (undoTidy()) return showReview();
  if (undo.length) { restoreBoxes(undo); undo = []; showReview(); } else toast("Nothing to undo.");
});

export function showNoneFound() {
  stopReview();
  openSheet(`<div><h2>No missing buildings found</h2><p class="mid" style="margin:4px 0 0">If you can see a roof the AI missed, draw it yourself.</p></div>${drawBtn}`);
  $("#drawSelf").onclick = drawYourself;
}

// The slim bar: counts, Add, and a More menu.
export function showReview() {
  const boxes = currentBoxes();
  if (!boxes.length) { stopReview(); return closeSheet(); }
  unfocus();
  showChips();
  const kept = boxes.filter(b => b.keep && b.reviewed), unreviewed = boxes.filter(b => b.keep && !b.reviewed), ready = boxes.some(b => b.from);
  openSheet(`<span class="rcount editorReviewCounts"><b>${unreviewed.length}</b> unreviewed · <b class="kept">${kept.length}</b> checked · <b>${boxes.filter(b => !b.keep).length}</b> dropped</span>
    <button class="ghost pill" id="reviewNext">${unreviewed.length ? "Review next" : "Review buildings"}</button>
    ${undo.length ? `<button class="ghost pill" id="undoRm">Undo remove</button>` : ""}
    ${canUndoTidy() ? `<button class="ghost pill" id="undoTidy">Undo tidy</button>` : ""}
    <button class="ghost pill" id="moreB" aria-expanded="false">More</button>
    <button class="primary pill" id="addKept"${kept.length ? "" : " disabled"}>Add ${kept.length} checked</button>
    <div id="confirmWrap" class="rwide" hidden><p class="reviewSummary">Send ${kept.length} checked building${kept.length === 1 ? "" : "s"}; ${unreviewed.length} unreviewed remain here.</p>${osmConfirm()}</div>
    <div id="moreMenu" class="moreMenu rwide" hidden>${ready ? `<button class="big ghost" id="aiScan" style="min-height:48px">Scan with our AI instead</button>` : ""}${drawBtn}
      <button class="big ghost" id="tidyChecked" style="min-height:48px"${kept.length ? "" : " disabled"}>Tidy checked outlines (with undo)</button>
      <button class="big ghost" id="saveTrain" style="min-height:48px">Save checked ones for AI training</button></div>`, true);
  $("#reviewNext").onclick = () => fixBox(unreviewed[0] || boxes.find(b => b.keep) || boxes[0]);
  if ($("#undoTidy")) $("#undoTidy").onclick = () => { undoTidy(); showReview(); };
  $("#tidyChecked").onclick = () => tidyThen(kept);
  $("#bsheet .x").onclick = () => { closeSheet(); stopReview(); };
  if ($("#undoRm")) $("#undoRm").onclick = () => { restoreBoxes(undo); undo = []; showReview(); };
  $("#moreB").onclick = () => { const m = $("#moreMenu"); m.hidden = !m.hidden; $("#moreB").setAttribute("aria-expanded", !m.hidden); };
  if ($("#aiScan")) $("#aiScan").onclick = scanWithAi;
  $("#drawSelf").onclick = drawYourself;
  $("#saveTrain").onclick = () => kept.length ? saveForTraining(kept) : toast("Review the buildings and choose Check and next first.");
  let warned = false; // the overlap warning shows once; tapping again adds anyway
  $("#addKept").onclick = async () => {
    if ($("#confirmWrap").hidden) { $("#confirmWrap").hidden = false; return toast("Tick the box to confirm you checked them, then tap Add again."); }
    if (!osmAllowed()) return;
    const problem = kept.map(b => validatePolygon(b.coords) || validateBuildingTags(b.tags || {})).find(Boolean);
    if (problem) return toast(problem);
    const clash = kept.filter(b => overlapsExisting(b.coords)).length;
    if (clash && !warned) { warned = true; return toast(`${clash} kept building${clash > 1 ? "s overlap ones" : " overlaps one"} already on the map. Tap Add again to add anyway.`); }
    $("#addKept").disabled = true; // no double send
    try {
      const n = `${kept.length} building${kept.length > 1 ? "s" : ""}`;
      const items = kept.map(b => ({ corners: b.coords, tags: { ...b.tags } }));
      const r = await sendOrQueue({ kind: "create", items, source: sourceOf(kept),
        comment: kept.some(b => b.from) ? `Add missing buildings from ${[...new Set(kept.map(b => b.from).filter(Boolean).map(short))].join("/")} outlines, checked against satellite imagery` : "Add missing buildings traced from satellite imagery" });
      showSentBuildings(items, r.result);
      toast(r.queued ? "Edit saved on this device; check Pending edits for sending status." : `${n} added to OpenStreetMap`);
      undo = [];
      removeBoxes(kept); // the rest stay, so you can keep checking
      showReview();
    } catch (e) { $("#addKept").disabled = false; toast("Could not reach OpenStreetMap: " + e.message); }
  };
}
