// Finds buildings missing from OpenStreetMap by reading satellite pictures of the whole visible map.
import { state } from "../data/state.js";
import { findOutlines } from "../data/api.js";
import { getSatelliteView, viewCentres } from "../data/satellite.js";
import { mid, inside, dist } from "../data/geo.js";
import { map } from "./mapView.js";
import { loadBuildings } from "./buildingLayer.js";
import { showSuggestion } from "./suggestSheet.js";
import { showBatch } from "./batchSheet.js";
import { toast } from "./toast.js";

const MAX_VIEWS = 6, MIN_ZOOM = 17;
let layer = null;

const near = (center, o) => inside(center, o.coords) || dist(center[0], center[1], o.center[0], o.center[1]) < 6;

async function scanView([lat, lng]) {
  const view = await getSatelliteView(lat, lng);
  const found = (await findOutlines(view.image)).buildings || [];
  return found.map(b => {
    const coords = b.points.map(([x, y]) => view.toLatLng(x, y));
    return { coords, center: mid(coords), confidence: b.confidence };
  });
}

export async function findMissing() {
  if (map.getZoom() < MIN_ZOOM) return toast("Zoom in closer to scan.");
  layer ||= L.layerGroup().addTo(map);
  layer.clearLayers();
  const views = viewCentres(map.getBounds(), MAX_VIEWS);
  toast(`Reading ${views.length} satellite picture${views.length > 1 ? "s" : ""}…`);
  const [, ...results] = await Promise.allSettled([loadBuildings(), ...views.map(scanView)]);
  const failed = results.filter(r => r.status === "rejected").length;
  const missing = [];
  for (const b of results.flatMap(r => r.value || [])) {
    if ([...state.buildings.values()].some(o => near(b.center, o)) || missing.some(o => near(b.center, o))) continue;
    missing.push(b);
  }
  missing.forEach(b => {
    b.shape = L.polygon(b.coords, { color: "#E8470F", weight: 2, dashArray: "6 6", fillColor: "#E8470F", fillOpacity: 0.15 }).addTo(layer)
      .on("click", e => { L.DomEvent.stopPropagation(e); showSuggestion(b.coords, b.center, b.confidence); });
  });
  if (failed === results.length) return toast("Could not read the satellite image.");
  toast(`${missing.length ? `${missing.length} missing found.` : "No missing buildings found here."}${failed ? ` ${failed} picture(s) failed.` : ""}`);
  if (missing.length) showBatch(missing, () => layer.clearLayers());
}
