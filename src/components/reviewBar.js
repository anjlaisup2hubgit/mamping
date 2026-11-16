// Checking the boxes right on the map, with no list in the way. Every box starts kept: tap one to see how sure
// the AI is and edit it, double tap to drop it (or bring it back). The buttons at the top change a tap to remove or fix shape. Turn on Select to hold and drag over many boxes at once.
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
import { currentBoxes, removeBoxes, restoreBoxes, restyle, saveBoxes, fixBox, fixAt, focusedBox, unfocus, drawYourself, scanWithAi, findMissing, saveForTraining, showSure, hideSure } from "./missingLayer.js";

const drawBtn = `<button class="big ghost" id="drawSelf" style="min-height:48px">AI missed one? Draw it yourself</button>`;
const short = from => from.split(" ")[0]; // "Microsoft ML Buildings" -> "Microsoft"
const sourceOf = list => [...new Set(list.map(b => b.from).filter(Boolean)), "Esri World Imagery"].join("; ");
let mode = "fix", chips = null, dragReady = false, selecting = false, undo = []; // undo = the boxes the last remove took off

let picked = new Set(); // boxes chosen with shift+click
const pick = b => { b.picked = !b.picked; if (b.picked) picked.add(b); else picked.delete(b); };
const clearPicked = () => { picked.forEach(b => { b.picked = false; }); picked = new Set(); restyle(); };

// A box on the map was tapped. shift = Shift was held: add it to (or take it out of) the selection.
export function tapBox(b, shift = false) {
  if (shift) { pick(b); restyle(); return showReview(); }
  if (!chips) showChips(); // the first tap goes straight to editing that building
  if (selecting) return; // in Select, the drag already did it
  if (mode === "fix") return fixBox(b);
  if (mode === "keep") return fixBox(b);
  apply([b]);
}

export const isReviewing = () => !!chips;

// The Edits button: opens the editing tools for the found buildings, or asks how to start if there are none yet.
export function startEditing() {
  if (currentBoxes().length) { showReview(); return editFirst(); }
  openSheet(`<div><h2>Edit buildings</h2><p class="mid" style="margin:4px 0 0">Let the AI find missing roofs, or draw one yourself.</p></div>
    <button class="primary big" id="startFind" style="min-height:44px">Find missing</button>
    <button class="big ghost" id="startDraw" style="min-height:44px">Draw outline</button>`);
  $("#startFind").onclick = () => { closeSheet(); findMissing(); };
  $("#startDraw").onclick = drawYourself;
}

// Fix-bar "Remove": takes one box off the map; "Undo remove" brings it back.
export function dropOne(b) { undo = [b]; removeBoxes([b]); showReview(); }

// Tidy: squares the boxes and lines them up with the road.
const tidyThen = async list => {
  try { await tidy(list); list.forEach(b => { b.reviewed = false; }); await saveBoxes(); showReview(); }
  catch (e) { toast(e.message || "Could not tidy these buildings."); }
};

// Check: marks them checked. Remove: takes them off the map.
function apply(list) {
  if (mode === "tidy") return tidyThen(list);
  if (mode === "keep") {
    list.forEach(b => { b.keep = true; b.reviewed = !validatePolygon(b.coords) && !validateBuildingTags(b.tags || {}); });
    restyle(); saveBoxes(); undo = [];
  } else { undo = list; removeBoxes(list); }
  showReview();
}

export function stopReview() {
  chips = null;
  mode = "fix";
  clearPicked();
  setSelecting(false);
  hideSure();
  unfocus();
}

// Marks that checking has started (chips = true), and turns on drag-to-select once.
function showChips() {
  if (!dragReady) { dragReady = true; startSelectDrag(); }
  chips = true;
}

// Edit: opens edit mode on the first building not checked yet.
function editFirst() {
  const boxes = currentBoxes();
  if (!boxes.length) return startEditing();
  fixAt(boxes.indexOf(boxes.find(b => b.keep && !b.reviewed) || boxes[0]));
}

// The rail's Select button: pick several buildings (tap or drag over them), then act on them all from the bottom bar.
export function toggleSelect() {
  const b = focusedBox();
  setSelecting(!selecting);
  if (selecting && b && !b.picked) pick(b); // the building being edited starts the selection
  showReview();
}

// Select on: the map stops moving, and holding the mouse (or finger) down and dragging over boxes does the tap to each one.
function setSelecting(on) {
  selecting = on;
  if (on) map.dragging.disable(); else map.dragging.enable();
  map.getContainer().classList.toggle("selecting", on);
  document.body.classList.toggle("selectingMany", on); // keeps the tool rail on screen while picking
  const b = document.querySelector('.editRail [data-act="select"]');
  if (b) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }
}

function startSelectDrag() {
  let touched = null, turnOn = true; // touched = boxes this drag went over
  const hit = e => {
    const p = map.mouseEventToLatLng(e), pt = [p.lat, p.lng];
    const b = currentBoxes().find(o => !touched.has(o) && inside(pt, o.coords));
    if (!b) return;
    if (!touched.size) turnOn = !b.picked; // the first box decides: select all, or unselect all
    touched.add(b);
    if (b.picked !== turnOn) { pick(b); restyle(); }
  };
  map.getContainer().addEventListener("pointerdown", e => {
    if (!selecting || e.button !== 0 || e.target.closest(".modeChips,.editRail")) return;
    touched = new Set();
    hit(e);
  }, true);
  window.addEventListener("pointermove", e => { if (touched) hit(e); });
  window.addEventListener("pointerup", () => {
    if (!touched) return;
    const list = [...touched];
    touched = null;
    if (list.length) showReview();
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

// The slim bar: counts, Review next, Add (once some are ready), and a More menu for the rest.
export function showReview() {
  const boxes = currentBoxes();
  if (!boxes.length) { stopReview(); return closeSheet(); }
  unfocus();
  showChips();
  const kept = boxes.filter(b => b.keep && b.reviewed), unreviewed = boxes.filter(b => b.keep && !b.reviewed), ready = boxes.some(b => b.from);
  picked = new Set([...picked].filter(b => boxes.includes(b))); // removed boxes leave the selection
  const sel = [...picked];
  openSheet(`${sel.length ? `<div class="rwide pickedRow"><b>${sel.length} selected</b>
      <button class="ghost pill" id="pSquare">Square</button><button class="ghost pill" id="pCheck">Check</button>
      <button class="ghost pill" id="pRemove">Remove</button><button class="ghost pill" id="pClear">Clear</button></div>` : ""}
    <span class="rcount editorReviewCounts"><b>${unreviewed.length}</b> to check · <b class="kept">${kept.length}</b> ready</span>
    ${undo.length ? `<button class="ghost pill" id="undoRm">Undo remove</button>` : ""}
    ${canUndoTidy() ? `<button class="ghost pill" id="undoTidy">Undo square</button>` : ""}
    <button class="${kept.length ? "ghost" : "primary"} pill" id="reviewNext">${unreviewed.length ? "Review next" : "Review"}</button>
    ${kept.length ? `<button class="primary pill" id="addKept">Add ${kept.length}</button>` : ""}
    <button class="ghost pill" id="moreB" aria-expanded="false">More</button>
    <div id="confirmWrap" class="rwide" hidden><p class="reviewSummary">Send ${kept.length} checked building${kept.length === 1 ? "" : "s"}; ${unreviewed.length} unreviewed remain here.</p>${osmConfirm()}</div>
    <div id="moreMenu" class="moreMenu rwide" hidden>${canUndoTidy() ? "" : `<button class="big ghost" id="squareAll">Square all outlines</button>`}
      <button class="big ghost" id="drawSelf">Draw an outline yourself</button>${ready ? `<button class="big ghost" id="aiScan">Scan with our AI instead</button>` : ""}
      <button class="big ghost" id="tidyChecked"${kept.length ? "" : " disabled"}>Tidy checked outlines (with undo)</button>
      <button class="big ghost" id="saveTrain">Save checked ones for AI training</button></div>`, true);
  $("#reviewNext").onclick = () => fixBox(unreviewed[0] || boxes.find(b => b.keep) || boxes[0]);
  if ($("#undoTidy")) $("#undoTidy").onclick = () => { undoTidy(); showReview(); };
  if (sel.length) { // one action for every selected box, then the selection clears
    $("#pSquare").onclick = () => { clearPicked(); tidyThen(sel); };
    $("#pCheck").onclick = () => { clearPicked(); mode = "keep"; apply(sel); };
    $("#pRemove").onclick = () => { clearPicked(); undo = sel; removeBoxes(sel); showReview(); };
    $("#pClear").onclick = () => { clearPicked(); showReview(); };
  }
  if ($("#squareAll")) $("#squareAll").onclick = () => tidyThen(boxes.filter(b => b.keep)); // every kept outline at once
  $("#tidyChecked").onclick = () => tidyThen(kept);
  $("#bsheet .x").onclick = () => { closeSheet(); stopReview(); };
  if ($("#undoRm")) $("#undoRm").onclick = () => { restoreBoxes(undo); undo = []; showReview(); };
  $("#moreB").onclick = () => { const m = $("#moreMenu"); m.hidden = !m.hidden; $("#moreB").setAttribute("aria-expanded", !m.hidden); };
  if ($("#aiScan")) $("#aiScan").onclick = scanWithAi;
  $("#drawSelf").onclick = drawYourself;
  $("#saveTrain").onclick = () => kept.length ? saveForTraining(kept) : toast("Review the buildings and choose Check and next first.");
  let warned = false; // the overlap warning shows once; tapping again adds anyway
  if ($("#addKept")) $("#addKept").onclick = async () => {
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
