// Finds buildings missing from OpenStreetMap by reading a satellite picture.
import { state } from "../data/state.js";
import { findOutlines } from "../data/api.js";
import { getSatelliteView } from "../data/satellite.js";
import { mid, inside, dist } from "../data/geo.js";
import { map } from "./mapView.js";
import { loadBuildings } from "./buildingLayer.js";
import { showSuggestion } from "./suggestSheet.js";
import { toast } from "./toast.js";

let layer = null;

const alreadyMapped = center => [...state.buildings.values()]
  .some(o => inside(center, o.coords) || dist(center[0], center[1], o.center[0], o.center[1]) < 6);

export async function findMissing() {
  layer ||= L.layerGroup().addTo(map);
  layer.clearLayers();
  toast("Reading satellite image…");
  try {
    const c = map.getCenter();
    const view = await getSatelliteView(c.lat, c.lng);
    await loadBuildings();
    const found = (await findOutlines(view.image)).buildings || [];
    let n = 0;
    for (const b of found) {
      const ll = b.points.map(([x, y]) => view.toLatLng(x, y));
      const center = mid(ll);
      if (alreadyMapped(center)) continue;
      n++;
      L.polygon(ll, { color: "#E8470F", weight: 2, dashArray: "6 6", fillColor: "#E8470F", fillOpacity: 0.15 }).addTo(layer)
        .on("click", e => { L.DomEvent.stopPropagation(e); showSuggestion(ll, center, b.confidence); });
    }
    toast(n ? `${n} missing building${n > 1 ? "s" : ""} found. Tap one.` : "No missing buildings found here.");
  } catch (e) { toast("Could not read the satellite image."); }
}
