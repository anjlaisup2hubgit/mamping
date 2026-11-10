// The small map shown in a corner of the camera.
import { TILE_URL } from "../data/config.js";
import { meIcon } from "./mapView.js";

export function createMiniMap(elementId, start) {
  const m = L.map(elementId, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false });
  L.tileLayer(TILE_URL).addTo(m);
  const dot = L.marker(start, { icon: meIcon }).addTo(m);
  m.setView(start, 18);
  setTimeout(() => m.invalidateSize(), 50);
  return {
    moveTo: p => { m.setView([p.lat, p.lng]); dot.setLatLng([p.lat, p.lng]); },
    destroy: () => m.remove()
  };
}
