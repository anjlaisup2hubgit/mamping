// Finds buildings missing from OpenStreetMap by reading satellite pictures of the whole visible map.
import { state } from "../data/state.js";
import { findBuildings } from "../data/finder.js";
import { outlineAll } from "../data/tracer.js";
import { getSatelliteView, viewCentres } from "../data/satellite.js";
import { mid, inside, dist } from "../data/geo.js";
import { map, liftIntoView } from "./mapView.js";
import { loadBuildings, refreshStyles } from "./buildingLayer.js";
import { showSuggestion } from "./suggestSheet.js";
import { showBatch } from "./batchSheet.js";
import { editCorners, stopEditing } from "./cornerEditor.js";
import { toast } from "./toast.js";
import { loadScan, saveScan } from "../data/savedScan.js";

const MAX_VIEWS = 6, MIN_ZOOM = 17;
let layer = null;

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
export async function findMissing() {
  const btn = document.querySelector("#findMiss");
  if (btn?.classList.contains("busy")) return;
  btn?.classList.add("busy");
  try { await scan(); } finally { btn?.classList.remove("busy"); }
}

const WHY = { 500: "The AI is not set up. Add a Gemini key in Settings.", 401: "Your Gemini key was refused. Check it in Settings.", 429: "The AI is busy. Try again in a minute." };

async function scan() {
  if (map.getZoom() < MIN_ZOOM) return toast("Zoom in closer to scan.");
  layer ||= L.layerGroup().addTo(map);
  layer.clearLayers();
  stopEditing();
  const views = viewCentres(map.getBounds(), MAX_VIEWS);
  toast(`Reading ${views.length} satellite picture${views.length > 1 ? "s" : ""}…`);
  const [, ...results] = await Promise.allSettled([loadBuildings(), ...views.map(scanView)]);
  const failed = results.filter(r => r.status === "rejected").length;
  results.filter(r => r.status === "rejected").forEach(r => console.error("[scan] failed:", r.reason));
  const missing = [];
  for (const b of results.flatMap(r => r.value || [])) {
    if ([...state.buildings.values()].some(o => near(b.center, o)) || missing.some(o => near(b.center, o))) continue;
    missing.push(b);
  }
  if (failed === results.length) return toast(WHY[results[0].reason?.message] || "Could not read the satellite image. Check your internet and try again.");
  drawMissing(missing);
  save(missing);
  toast(`${missing.length ? `${missing.length} missing found.` : "No missing buildings found here."}${failed ? ` ${failed} picture(s) failed.` : ""}`);
  if (missing.length) showBatch(missing, clearMissing);
}

function drawMissing(list) {
  layer ||= L.layerGroup().addTo(map);
  list.forEach(b => {
    b.shape = L.polygon(b.coords, { color: "#E8470F", weight: 2, dashArray: "6 6", fillColor: "#E8470F", fillOpacity: 0.15 }).addTo(layer)
      .on("click", e => { L.DomEvent.stopPropagation(e); state.selectedId = null; refreshStyles(); editCorners(b); showSuggestion(b); liftIntoView(b.center); });
  });
}

const save = list => saveScan(list).catch(() => toast("Could not save your boxes to your account."));

function clearMissing() {
  layer.clearLayers();
  stopEditing();
  save([]);
}

// Puts the boxes from the last scan (yours, if logged in) back on the map after a refresh.
export async function restoreMissing() {
  drawMissing(await loadScan());
}
