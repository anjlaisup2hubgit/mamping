// Draws OpenStreetMap buildings on the map and loads more as you move.
import { state } from "../data/state.js";
import { fetchBuildingsIn } from "../data/overpass.js";
import { getQueue } from "../data/osmSend.js";
import { mid } from "../data/geo.js";
import { map } from "./mapView.js";
import { toast } from "./toast.js";

let layer = null, onTap = null, timer = null, pending = null, warned = false;

export function startBuildingLayer(tapHandler) {
  onTap = tapHandler;
  // Own map layer, so buildings show on every map, under the orange boxes.
  map.createPane("osm").style.zIndex = 390;
  layer = L.layerGroup().addTo(map);
  getQueue().filter(j => j.kind === "create").forEach(j => showSentBuildings(j.items)); // still waiting from last time
  map.on("moveend", () => { clearTimeout(timer); timer = setTimeout(loadBuildings, 500); });
}

export function styleFor(b) {
  if (b.id === state.selectedId) return { color: "#2f7df0", weight: 4, fillColor: "#6cb6ff", fillOpacity: 0.45 };
  if (state.needsHeight) return b.ht || b.levels
    ? { color: "#4b9cf0", weight: 1.5, fillColor: "#9ccbf8", fillOpacity: 0.35 }
    : { color: "#e0a400", weight: 2, fillColor: "#ffe17a", fillOpacity: 0.45 };
  const has = state.contribs.some(c => c.buildingId === b.id);
  return has
    ? { color: "#2f7df0", weight: 2, fillColor: "#6cb6ff", fillOpacity: 0.3 }
    : { color: "#8aa3c2", weight: 1, fillColor: "#dcebff", fillOpacity: 0.35 };
}

export const refreshStyles = () => state.buildings.forEach(b => b.layer.setStyle(styleFor(b)));
export function setNeedsHeight(on) { state.needsHeight = on; refreshStyles(); }

function add(b) {
  if (state.buildings.has(b.id)) return;
  b.layer = L.polygon(b.coords, { ...styleFor(b), pane: "osm" }).addTo(layer)
    .on("click", e => { L.DomEvent.stopPropagation(e); onTap(b.id); });
  state.buildings.set(b.id, b);
}

// Puts buildings you just sent on the map now, since the map's copy of OpenStreetMap can take minutes to show them.
// That way a new scan skips them and you are warned before adding them twice.
// ways = the ids OpenStreetMap gave them; none yet if they are waiting in the offline queue.
let waiting = 0;
export function showSentBuildings(items, ways = []) {
  items.forEach(({ corners, tags }, i) =>
    add({ id: ways[i]?.id ?? "waiting-" + ++waiting, coords: corners, center: mid(corners), kind: "yes", name: tags.name || null, ht: null, levels: null, addr: "" }));
}

async function run() {
  try {
    for (const b of await fetchBuildingsIn(map.getBounds().pad(0.1))) add(b);
    dispatchEvent(new Event("buildings-loaded"));
    warned = false;
  } catch (e) { if (!warned) toast("Could not load buildings. Check your connection."); warned = true; } // say it once, not after every drag
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
