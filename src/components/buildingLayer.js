// Draws OpenStreetMap buildings on the map and loads more as you move.
import { state } from "../data/state.js";
import { fetchBuildingsIn } from "../data/overpass.js";
import { map } from "./mapView.js";
import { toast } from "./toast.js";

let layer = null, onTap = null, timer = null, pending = null;

export function startBuildingLayer(tapHandler) {
  onTap = tapHandler;
  layer = L.layerGroup().addTo(map);
  map.on("moveend", () => { clearTimeout(timer); timer = setTimeout(loadBuildings, 500); });
}

export function styleFor(b) {
  if (b.id === state.selectedId) return { color: "#E8470F", weight: 4, fillColor: "#E8470F", fillOpacity: 0.3 };
  const has = state.contribs.some(c => c.buildingId === b.id);
  return has
    ? { color: "#E8470F", weight: 2, fillColor: "#E8470F", fillOpacity: 0.2 }
    : { color: "#7a7a74", weight: 1, fillColor: "#9a9a94", fillOpacity: 0.25 };
}

export const refreshStyles = () => state.buildings.forEach(b => b.layer.setStyle(styleFor(b)));

async function run() {
  try {
    for (const b of await fetchBuildingsIn(map.getBounds().pad(0.1))) {
      if (state.buildings.has(b.id)) continue;
      b.layer = L.polygon(b.coords, styleFor(b)).addTo(layer)
        .on("click", e => { L.DomEvent.stopPropagation(e); onTap(b.id); });
      state.buildings.set(b.id, b);
    }
  } catch (e) { toast("Could not load buildings. Check your connection."); }
}

export function loadBuildings() {
  if (pending) return pending;
  if (map.getZoom() < 16) return Promise.resolve();
  pending = run().finally(() => { pending = null; });
  return pending;
}

export function setBuildingsVisible(on) {
  if (on) layer.addTo(map); else map.removeLayer(layer);
}
export const buildingsVisible = () => map.hasLayer(layer);
