// Checking the orange boxes right on the map, with no list in the way. Pick what a tap does at the top
// (keep, remove or fix shape), then tap boxes. Turn on Select to hold and drag over many boxes at once.
// A slim bar at the bottom counts them and adds the kept ones to OpenStreetMap together.
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { sendOrQueue } from "../data/osmSend.js";
import { overlapsExisting } from "../data/buildings.js";
import { inside } from "../data/geo.js";
import { currentBoxes, removeBoxes, restoreBoxes, restyle, saveBoxes, fixBox, unfocus, drawYourself, scanWithAi, saveForTraining } from "./missingLayer.js";

const MODES = { keep: "Keep", remove: "Remove", fix: "Fix shape" };
const drawBtn = `<button class="big ghost" id="drawSelf" style="min-height:48px">AI missed one? Draw it yourself</button>`;
const short = from => from.split(" ")[0]; // "Microsoft ML Buildings" -> "Microsoft"
const sourceOf = list => [...new Set(list.map(b => b.from).filter(Boolean)), "Esri World Imagery"].join("; ");
let mode = "keep", chips = null, dragReady = false, selecting = false, undo = []; // undo = the boxes the last remove took off

// A box on the map was tapped.
export function tapBox(b) {
  if (!chips) return showReview(); // the first tap only opens the review, it changes nothing
  if (selecting) return; // in Select, the drag already did it
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
  setSelecting(false);
  unfocus();
}

// The buttons at the top that choose what a tap does.
function showChips() {
  if (!dragReady) { dragReady = true; startSelectDrag(); }
  if (!chips) {
    chips = L.DomUtil.create("div", "modeChips", map.getContainer());
    L.DomEvent.disableClickPropagation(chips); // a tap here is not a tap on the map
    chips.innerHTML = Object.entries(MODES).map(([k, t]) => `<button class="chip" data-mode="${k}">${t}</button>`).join("")
      + `<span class="chipLine"></span><button class="chip sel" id="selB" aria-pressed="false">Select</button>`;
    chips.querySelectorAll("[data-mode]").forEach(c => { c.onclick = () => { mode = c.dataset.mode; if (mode === "fix") setSelecting(false); showReview(); }; }); // also brings the bar back after fixing a shape
    chips.querySelector("#selB").onclick = () => { setSelecting(!selecting); if (mode === "fix") mode = "keep"; showReview(); };
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
    if (!touched.size) turnOn = !b.keep; // the first box decides: keep all, or unkeep all
    touched.add(b);
    if (mode === "keep") { b.keep = turnOn; restyle(); } else b.shape.setStyle({ opacity: 0.2, fillOpacity: 0 }); // fades until let go
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
    if (mode === "keep") { saveBoxes(); undo = []; } else { undo = list; removeBoxes(list); }
    showReview();
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
