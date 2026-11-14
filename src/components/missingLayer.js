// Finds buildings missing from OpenStreetMap in an area the user picks: first from ready-made outlines
// (Microsoft's and Google's AI, instant and free), and if there are none, by asking our AI to read satellite pictures.
import { state } from "../data/state.js";
import { findBuildings } from "../data/finder.js";
import { outlineAll } from "../data/tracer.js";
import { getSatelliteView } from "../data/satellite.js";
import { mid, inside, dist } from "../data/geo.js";
import { map, liftIntoView, currentBase, setBaseLayer } from "./mapView.js";
import { loadBuildings, refreshStyles } from "./buildingLayer.js";
import { showSuggestion } from "./suggestSheet.js";
import { showReview, showNoneFound, tapBox } from "./reviewBar.js";
import { editCorners, stopEditing } from "./cornerEditor.js";
import { startDrawing } from "./drawBuilding.js";
import { toast } from "./toast.js";
import { loadScan, saveScan } from "../data/savedScan.js";
import { readyIn } from "../data/readyBuildings.js";
import { pickArea } from "./areaPicker.js";
import { saveTrainingSet } from "../data/trainingSet.js";

const MAX_VIEWS = 6, MIN_ZOOM = 17, MAX_READY = 500; // a few hundred is fine to check by tapping on the map
let layer = null, boxes = [], area = null, squares = []; // boxes = the orange outlines now on the map; area = the last area scanned, squares = its chosen pictures

// True if a point [lat, lng] sits in one of the chosen picture squares.
const picked = ([lat, lng]) => squares.some(p => lat <= p.nw[0] && lat >= p.se[0] && lng >= p.nw[1] && lng <= p.se[1]);

const near = (center, o) => inside(center, o.coords) || dist(center[0], center[1], o.center[0], o.center[1]) < 6;

async function scanView([lat, lng]) {
  const view = await getSatelliteView(lat, lng);
  const found = await outlineAll(view.image, await findBuildings(view.image));
  console.log("[scan] found", found.length, "buildings at", lat, lng);
  return found.map(b => {
    const coords = b.points.map(([x, y]) => view.toLatLng(x, y));
    return { coords, center: mid(coords), confidence: b.confidence };
  });
}

// Pulses the scan button while working, so you can tell something is happening.
async function busy(work) {
  const btn = document.querySelector("#findMiss");
  if (btn?.classList.contains("busy")) return;
  btn?.classList.add("busy");
  try { await work(); } finally { btn?.classList.remove("busy"); }
}
// The scan button: switch to satellite (roofs are easiest to see), choose an area, then scan only that.
export function findMissing() {
  if (map.getZoom() < MIN_ZOOM) return toast("Zoom in closer to scan.");
  if (currentBase() !== "satellite") setBaseLayer("satellite");
  pickArea((box, chosen) => { area = box; squares = chosen; busy(async () => { if (!(await showReady())) await scan(); }); }, MAX_VIEWS);
}
export const scanWithAi = () => busy(scan); // same area as the last scan

// "Save for AI training": keeps the pictures of the last scan, with the buildings you ticked as the answers.
export async function saveForTraining(ticked) {
  if (!squares.length) return toast("Scan an area first, then save.");
  // Any roof left out would teach the AI to ignore roofs, so the user must confirm every one is boxed and ticked.
  if (!confirm("Is EVERY roof in the scanned pictures boxed and ticked? (Draw the ones the AI missed, then tick them.) A roof left out teaches the AI to ignore roofs.")) return;
  toast("Saving pictures…");
  try { const n = await saveTrainingSet(squares, ticked); toast(n ? `Saved ${n} picture${n > 1 ? "s" : ""} to the training folder.` : "None of the ticked buildings are in the scanned area."); }
  catch (e) { toast("Could not save. Run the app with node dev-server.js on your computer."); }
}

// Adds new boxes next to the ones already found, so an earlier scan is never lost. Skips any that sit on an old box.
function addBoxes(list) {
  stopEditing();
  const fresh = list.filter(b => !boxes.some(o => near(b.center, o)));
  boxes = boxes.concat(fresh);
  fresh.forEach(drawBox);
  saveBoxes();
}

// Shows the ready-made outlines nearest the middle of the area. Returns false if there are none (or no connection).
async function showReady() {
  const view = area, c = area.getCenter();
  let list;
  const osm = Promise.race([loadBuildings(), new Promise(ok => setTimeout(ok, 5000))]); // a slow OpenStreetMap server should not hold this up
  try { [, list] = await Promise.all([osm, readyIn(view)]); } catch (e) { console.warn("[ready] not available:", e); return false; }
  list = list.filter(b => picked(b.center) && ![...state.buildings.values()].some(o => near(b.center, o)))
    .sort((a, b) => dist(c.lat, c.lng, a.center[0], a.center[1]) - dist(c.lat, c.lng, b.center[0], b.center[1]));
  if (!list.length) return false;
  addBoxes(list.slice(0, MAX_READY));
  toast(list.length > MAX_READY ? `Showing the ${MAX_READY} nearest of ${list.length}. Move the map to see more.` : `${list.length} ready-made outline${list.length > 1 ? "s" : ""} found.`);
  showReview();
  return true;
}

const WHY = { 500: "The AI is not set up. Add a Gemini key in Settings.", 401: "Your Gemini key was refused. Check it in Settings.", 429: "The AI is busy. Try again in a minute." };

async function scan() {
  const views = squares.map(p => p.centre);
  toast(`Reading ${views.length} satellite picture${views.length > 1 ? "s" : ""}…`);
  const [, ...results] = await Promise.allSettled([loadBuildings(), ...views.map(scanView)]);
  const failed = results.filter(r => r.status === "rejected").length;
  results.filter(r => r.status === "rejected").forEach(r => console.error("[scan] failed:", r.reason));
  const missing = [];
  for (const b of results.flatMap(r => r.value || [])) {
    if (!picked(b.center)) continue; // pictures reach past the edge of the chosen squares
    if ([...state.buildings.values()].some(o => near(b.center, o)) || missing.some(o => near(b.center, o))) continue;
    missing.push(b);
  }
  if (failed === results.length) return toast(WHY[results[0].reason?.message] || "Could not read the satellite image. Check your internet and try again.");
  addBoxes(missing);
  toast(`${missing.length ? `${missing.length} missing found.` : "No missing buildings found here."}${failed ? ` ${failed} picture(s) failed.` : ""}`);
  if (boxes.length) showReview(); else showNoneFound(); // with none found, it offers to draw one yourself
}

// thin lines so the roof underneath stays visible
const STYLE = { color: "#E8470F", weight: 1.5, dashArray: "6 6", fillColor: "#E8470F", fillOpacity: 0.15 };
const PICKED = { color: "#FFD166", weight: 1.5, dashArray: null, fillColor: "#FFD166", fillOpacity: 0.08 }; // the one being looked at
const KEPT = { color: "#2EA043", weight: 1.5, dashArray: null, fillColor: "#2EA043", fillOpacity: 0.35 }; // checked: add it
let focused = null;
const styleOf = o => o === focused ? PICKED : o.keep ? KEPT : STYLE;
export const restyle = () => boxes.forEach(o => o.shape && o.shape.setStyle(styleOf(o)));

const leaveFix = () => { if (focused && !state.drawing && !state.picking) unfocus(); }; // a tap on empty map ends fixing

function drawBox(b) {
  if (!layer) { layer = L.layerGroup().addTo(map); map.on("click", leaveFix); }
  b.shape = L.polygon(b.coords, styleOf(b)).addTo(layer)
    .on("click", e => { if (state.drawing) return; L.DomEvent.stopPropagation(e); tapBox(b); });
}

// "Fix shape": the box turns yellow with corner handles, and its own panel opens.
export function fixBox(b) {
  state.selectedId = null;
  refreshStyles();
  focusBox(b);
  showSuggestion(b);
  liftIntoView(b.center);
}

// Turns one box yellow (the others back to orange, or white-edged if chosen for removal) and shows its corner handles.
export function focusBox(b) {
  focused = b;
  restyle();
  editBox(b);
}

export const unfocus = () => { focused = null; stopEditing(); restyle(); }; // no box yellow, no corner handles
export const currentBoxes = () => boxes;
export const saveBoxes = () => saveScan(boxes).catch(e => toast(e.message === "401"
  ? "Your login ran out. Log in again; your boxes are kept on this phone until then."
  : "No connection to your account right now. Your boxes are kept on this phone and will be sent later."));
export const editBox = b => editCorners(b, saveBoxes); // shape fixes are saved as you make them

// "Not a building": takes wrong boxes off the map (one or many at once).
export const removeBox = b => removeBoxes([b]);
export function removeBoxes(list) {
  boxes = boxes.filter(x => !list.includes(x));
  list.forEach(b => b.shape && b.shape.remove());
  stopEditing();
  saveBoxes();
}
// Puts removed boxes back ("Undo remove").
export function restoreBoxes(list) {
  boxes = boxes.concat(list);
  list.forEach(drawBox);
  saveBoxes();
}

// Adds one outline the user made (drawn or copied) as a new box.
export function addBox(coords) {
  const b = { coords, center: mid(coords), confidence: null };
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
    liftIntoView(b.center);
  });
}

// Puts the boxes from the last scan (yours, if logged in) back on the map after a refresh.
export async function restoreMissing() {
  boxes = await loadScan();
  boxes.forEach(drawBox);
}
