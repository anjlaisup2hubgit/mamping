// Checking the orange boxes right on the map, with no list in the way. Pick what a tap does at the top
// (keep, remove or fix shape), then tap boxes. On a computer, hold Shift and drag to do it to many at once.
// A slim bar at the bottom counts them and adds the kept ones to OpenStreetMap together.
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { sendOrQueue } from "../data/osmSend.js";
import { overlapsExisting } from "../data/buildings.js";
import { currentBoxes, removeBoxes, restoreBoxes, restyle, saveBoxes, fixBox, unfocus, drawYourself, scanWithAi, saveForTraining } from "./missingLayer.js";

const MODES = { keep: "Tap = keep", remove: "Tap = remove", fix: "Tap = fix shape" };
const drawBtn = `<button class="big ghost" id="drawSelf" style="min-height:48px">AI missed one? Draw it yourself</button>`;
const short = from => from.split(" ")[0]; // "Microsoft ML Buildings" -> "Microsoft"
const sourceOf = list => [...new Set(list.map(b => b.from).filter(Boolean)), "Esri World Imagery"].join("; ");
let mode = "keep", chips = null, dragReady = false, undo = []; // undo = the boxes the last remove took off

// A box on the map was tapped.
export function tapBox(b) {
  if (!chips) return showReview(); // the first tap only opens the review, it changes nothing
  if (mode === "fix") return fixBox(b);
  apply([b]);
}

// Keep: marks them green (or unmarks, if all were green already). Remove: takes them off the map.
function apply(list) {
  if (mode === "keep") {
    const on = !list.every(b => b.keep);
    list.forEach(b => { b.keep = on; });
    restyle(); saveBoxes(); undo = [];
  } else { undo = list; removeBoxes(list); }
  showReview();
}

export function stopReview() {
  if (chips) chips.remove();
  chips = null;
  mode = "keep";
  unfocus();
}

// The buttons at the top that choose what a tap does.
function showChips() {
  if (!dragReady) { dragReady = true; startShiftDrag(); }
  if (!chips) {
    chips = L.DomUtil.create("div", "modeChips", map.getContainer());
    L.DomEvent.disableClickPropagation(chips); // a tap here is not a tap on the map
    const tip = matchMedia("(pointer: fine)").matches ? `<span class="chipTip">Shift + drag to do many at once</span>` : "";
    chips.innerHTML = Object.entries(MODES).map(([k, t]) => `<button class="chip" data-mode="${k}">${t}</button>`).join("") + tip;
    chips.querySelectorAll("[data-mode]").forEach(c => { c.onclick = () => { mode = c.dataset.mode; showReview(); }; }); // also brings the bar back after fixing a shape
  }
  chips.querySelectorAll("[data-mode]").forEach(c => c.classList.toggle("on", c.dataset.mode === mode));
}

// Shift + drag on a computer: draws a box, and everything whose middle is inside gets the tap.
function startShiftDrag() {
  map.boxZoom.disable(); // Shift + drag used to zoom; now it marks boxes
  let start = null, rect = null;
  map.getContainer().addEventListener("mousedown", e => {
    if (!e.shiftKey || e.button !== 0 || !chips || mode === "fix") return;
    e.stopPropagation(); e.preventDefault(); // so the map does not move
    start = map.mouseEventToLatLng(e);
    rect = L.rectangle([start, start], { color: "#fff", weight: 2, dashArray: "4 4", fill: false, interactive: false }).addTo(map);
  }, true);
  window.addEventListener("mousemove", e => { if (start) rect.setBounds([start, map.mouseEventToLatLng(e)]); });
  window.addEventListener("mouseup", () => {
    if (!start) return;
    const area = rect.getBounds();
    rect.remove(); start = null;
    const inside = currentBoxes().filter(b => area.contains(b.center));
    if (inside.length) apply(inside);
  });
}

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
  const kept = boxes.filter(b => b.keep), ready = boxes.some(b => b.from);
  openSheet(`<span class="rcount"><b class="kept">${kept.length}</b> keep · <b>${boxes.length - kept.length}</b> to check</span>
    ${undo.length ? `<button class="ghost pill" id="undoRm">Undo remove</button>` : ""}
    <button class="ghost pill" id="moreB" aria-expanded="false">More</button>
    <button class="primary pill" id="addKept"${kept.length ? "" : " disabled"}>Add ${kept.length} to OpenStreetMap</button>
    <div id="confirmWrap" class="rwide" hidden>${osmConfirm()}</div>
    <div id="moreMenu" class="moreMenu rwide" hidden>${ready ? `<button class="big ghost" id="aiScan" style="min-height:48px">Scan with our AI instead</button>` : ""}${drawBtn}
      <button class="big ghost" id="saveTrain" style="min-height:48px">Save kept ones for AI training</button></div>`, true);
  $("#bsheet .x").onclick = () => { closeSheet(); stopReview(); };
  if ($("#undoRm")) $("#undoRm").onclick = () => { restoreBoxes(undo); undo = []; showReview(); };
  $("#moreB").onclick = () => { const m = $("#moreMenu"); m.hidden = !m.hidden; $("#moreB").setAttribute("aria-expanded", !m.hidden); };
  if ($("#aiScan")) $("#aiScan").onclick = scanWithAi;
  $("#drawSelf").onclick = drawYourself;
  $("#saveTrain").onclick = () => kept.length ? saveForTraining(kept) : toast("Keep the buildings that match the picture first.");
  let warned = false; // the overlap warning shows once; tapping again adds anyway
  $("#addKept").onclick = async () => {
    if ($("#confirmWrap").hidden) { $("#confirmWrap").hidden = false; return toast("Tick the box to confirm you checked them, then tap Add again."); }
    if (!osmAllowed()) return;
    const clash = kept.filter(b => overlapsExisting(b.coords)).length;
    if (clash && !warned) { warned = true; return toast(`${clash} kept building${clash > 1 ? "s overlap ones" : " overlaps one"} already on the map. Tap Add again to add anyway.`); }
    $("#addKept").disabled = true; // no double send
    try {
      const n = `${kept.length} building${kept.length > 1 ? "s" : ""}`;
      const r = await sendOrQueue({ kind: "create", items: kept.map(b => ({ corners: b.coords, tags: {} })), source: sourceOf(kept),
        comment: kept.some(b => b.from) ? `Add missing buildings from ${[...new Set(kept.map(b => b.from).filter(Boolean).map(short))].join("/")} outlines, checked against satellite imagery` : "Add missing buildings traced from satellite imagery" });
      toast(r.queued ? `No internet. ${n} will be sent when you are back online.` : `${n} added to OpenStreetMap`);
      undo = [];
      removeBoxes(kept); // the rest stay, so you can keep checking
      showReview();
    } catch (e) { $("#addKept").disabled = false; toast("Could not reach OpenStreetMap: " + e.message); }
  };
}
