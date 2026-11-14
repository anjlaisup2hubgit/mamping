// Lets the user tap one street; new and turned outlines then line up with it instead of the nearest road.
import { map } from "./mapView.js";
import { state } from "../data/state.js";
import { loadRoads, chooseStreetNear } from "../data/roads.js";
import { toast } from "./toast.js";

let line = null; // blue highlight on the chosen street

function show(road) {
  if (line) line.remove();
  line = road ? L.polyline(road, { color: "#1E7BE8", weight: 6, opacity: 0.7, interactive: false }).addTo(map) : null;
}

// Waits for one map tap. changed() runs afterwards so the caller can redraw.
export function pickStreet(changed) {
  toast("Tap a street to line up with. Tap away from streets to clear.");
  state.picking = true; // so this tap does not close the panel or leave the building being fixed
  map.once("click", async e => {
    await loadRoads(e.latlng.lat, e.latlng.lng);
    const road = chooseStreetNear(e.latlng.lat, e.latlng.lng);
    state.picking = false;
    show(road);
    toast(road ? "Street chosen" : "Street cleared");
    if (changed) changed();
  });
}
