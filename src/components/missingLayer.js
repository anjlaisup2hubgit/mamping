// Finds buildings missing from OpenStreetMap in an area the user picks: first from ready-made outlines
// (Microsoft's and Google's AI, instant and free), and if there are none, by asking our AI to read satellite pictures.
import { state } from "../data/state.js";
import { mid, inside, dist } from "../data/geo.js";
import { map, currentBase, setBaseLayer, glideTo } from "./mapView.js";
import { refreshStyles } from "./buildingLayer.js";
import { showSuggestion } from "./suggestSheet.js";
import { tapBox } from "./reviewBar.js";
import { editCorners, stopEditing } from "./cornerEditor.js";
import { startDrawing } from "./drawBuilding.js";
import { toast } from "./toast.js";
import { preloadPhotos } from "./photoPreload.js";
import { loadScan, saveScan } from "../data/savedScan.js";
import { validatePolygon } from "../data/geometry.js";

export { findMissing, scanWithAi, saveForTraining, cancelScan, retryFailedScan } from "./scanWorkflow.js";
let layer = null, boxes = [];

// Add streamed proposals without interrupting a building the user is already fixing.
export function addBoxes(list) {
  const fresh = [];
  list.forEach(b => {
    if (!validatePolygon(b.coords) && ![...boxes, ...fresh].some(o => nearBox(b.center, o))) fresh.push(b);
  });
  fresh.forEach(b => { b.keep = true; b.reviewed = false; b.tags ||= {}; b.id ||= crypto.randomUUID(); });
  boxes = boxes.concat(fresh);
  fresh.forEach(drawBox);
  if (fresh.length) saveBoxes();
  return fresh;
}

export const nearBox = (center, o) => inside(center, o.coords) || dist(center[0], center[1], o.center[0], o.center[1]) < 6;

// cyan stands out on orange roofs; the "box" class adds a dark edge (see styles.css)
const STYLE = { className: "box", color: "#22D3EE", weight: 2.5, dashArray: null, fillColor: "#22D3EE", fillOpacity: 0.15 };
const CHECKED = { ...STYLE, color: "#2E9E5B", fillColor: "#2E9E5B" };
const PICKED = { className: "box", color: "#FFD166", weight: 1.5, dashArray: null, fillColor: "#FFD166", fillOpacity: 0.08 }; // the one being looked at
let focused = null, tip = null;
const SELECTED = { ...PICKED, weight: 3, fillOpacity: 0.35 }; // shift+clicked, waiting for one action on all of them
const styleOf = o => o === focused ? PICKED : o.picked ? SELECTED : o.reviewed ? CHECKED : STYLE;
export const restyle = () => boxes.forEach(o => o.shape && o.shape.setStyle(styleOf(o)));

// The small label on a tapped box saying how sure the AI is that it is a roof.
export function showSure(b) {
  hideSure();
  const source = b.confidence != null ? `${Math.round(b.confidence * 100)}% sure` : b.from ? `From ${b.from.split(" ")[0]}` : "Drawn by you";
  const text = `${b.reviewed ? "Checked" : "Unreviewed"} · ${source}`;
  tip = L.tooltip({ direction: "top", className: "sure" }).setLatLng(b.center).setContent(text);
  map.openTooltip(tip);
}
export const hideSure = () => { if (tip) map.closeTooltip(tip); tip = null; };

const leaveFix = () => { hideSure(); if (focused && !state.drawing && !state.picking) unfocus(); }; // a tap on empty map ends fixing

function drawBox(b) {
  if (!layer) { layer = L.layerGroup().addTo(map); map.on("click", leaveFix); }
  b.shape = L.polygon(b.coords, styleOf(b)).addTo(layer)
    .on("click", e => { if (state.drawing) return; L.DomEvent.stopPropagation(e); tapBox(b, e.originalEvent.shiftKey); })
    .on("dblclick", e => { if (state.drawing) return; L.DomEvent.stopPropagation(e); }); // stopped, so the map does not zoom
}

// "Fix shape": the box turns yellow with corner handles, and its own panel opens.
export function fixBox(b) {
  if (currentBase() !== "satellite") setBaseLayer("satellite"); // roofs are easiest to fit on the photo
  state.selectedId = null;
  refreshStyles();
  focusBox(b);
  showSuggestion(b);
}

// Turns one box yellow (the others back to cyan) and shows its corner handles.
export function focusBox(b) {
  focused = b;
  restyle();
  editBox(b);
}

export const unfocus = () => { focused = null; stopEditing(); restyle(); }; // no box yellow, no corner handles
export const focusedBox = () => focused;
export const boxPosition = () => ({ i: boxes.indexOf(focused), n: boxes.length }); // "7 of 48"

// Fixes the box at position i (wraps round at both ends) and zooms in on it.
export function fixAt(i) {
  if (!boxes.length) return;
  goTo(boxes[((i % boxes.length) + boxes.length) % boxes.length]);
}
function goTo(b) {
  glideTo(b.center, Math.max(map.getZoom(), 19));
  fixBox(b);
  nearestTo(b).slice(0, 2).forEach(o => preloadPhotos(o.center)); // the next two are ready before you get there
}

// Other buildings, closest to b first.
const nearestTo = b => boxes.filter(o => o !== b)
  .sort((x, y) => dist(b.center[0], b.center[1], x.center[0], x.center[1]) - dist(b.center[0], b.center[1], y.center[0], y.center[1]));

// "Next": the closest building you have not checked or passed yet; "previous" goes back the way you came.
let trail = [];
export function fixNearest(from = focused) {
  if (!from) return;
  const near = nearestTo(from), unseen = near.filter(o => !trail.includes(o));
  const b = unseen.find(o => !o.reviewed) || unseen[0] || near[0];
  if (!b) return;
  trail.push(from);
  goTo(b);
}
export function fixBack() {
  while (trail.length) { const b = trail.pop(); if (boxes.includes(b)) return goTo(b); }
}
export const currentBoxes = () => boxes;
export const saveBoxes = () => saveScan(boxes).catch(e => {
  toast(e.detail || e.message || "Could not save your draft. Keep this page open and free storage before leaving.");
});
export const editBox = b => editCorners(b, saveBoxes); // shape fixes are saved as you make them

// "Not a building": takes wrong boxes off the map (one or many at once).
export const removeBox = b => removeBoxes([b]);
export function removeBoxes(list) {
  hideSure();
  boxes = boxes.filter(x => !list.includes(x));
  list.forEach(b => b.shape && b.shape.remove());
  stopEditing();
  saveBoxes();
}
// Outlines sent to OpenStreetMap (even from a retry in Settings) leave the map.
addEventListener("buildings-sent", e => {
  const gone = boxes.filter(b => e.detail.has(JSON.stringify(b.coords)));
  if (gone.length) removeBoxes(gone);
});
// Puts removed boxes back ("Undo remove").
export function restoreBoxes(list) {
  boxes = boxes.concat(list);
  list.forEach(drawBox);
  saveBoxes();
}

// Adds one outline the user made (drawn or copied) as a new box.
export function addBox(coords) {
  const b = { id: crypto.randomUUID(), coords, center: mid(coords), confidence: null, keep: true, reviewed: false, tags: {} };
  boxes.push(b);
  drawBox(b);
  saveBoxes();
  return b;
}

// For a building the AI missed: the user taps its corners, then it works like any other box.
export function drawYourself() {
  stopEditing(); // hide another box's handles so they don't get in the way
  startDrawing(coords => {
    const b = addBox(coords);
    focusBox(b);
    showSuggestion(b);
  });
}

// Puts the boxes from the last scan (yours, if logged in) back on the map after a refresh.
export async function restoreMissing() {
  boxes = await loadScan();
  boxes.forEach(drawBox);
}
