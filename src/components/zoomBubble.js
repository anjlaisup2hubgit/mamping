// A round zoomed-in picture shown while a corner is dragged, so a finger never hides the spot it is placing.
import { map } from "./mapView.js";
import { SATELLITE_TILE_URL } from "../data/config.js";

let box = null, mini = null, line = null;

// at = [lat, lng] of the corner, coords = the whole outline.
export function showBubble(at, coords) {
  if (!box) {
    box = L.DomUtil.create("div", "zoomBubble", map.getContainer());
    mini = L.map(box, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false, boxZoom: false });
    L.tileLayer(SATELLITE_TILE_URL, { maxNativeZoom: 19, maxZoom: 22 }).addTo(mini);
    line = L.polygon(coords, { color: "#FFD166", weight: 2, fill: false, interactive: false }).addTo(mini);
  }
  box.classList.add("on");
  mini.invalidateSize();
  line.setLatLngs(coords);
  mini.setView(at, Math.min(map.getZoom() + 2, 22), { animate: false });
}

export const hideBubble = () => { if (box) box.classList.remove("on"); };
