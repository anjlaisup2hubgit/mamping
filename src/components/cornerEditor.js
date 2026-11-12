// Draggable dots on the corners of a missing-building outline, so the user can fix its shape.
import { map } from "./mapView.js";
import { mid } from "../data/geo.js";

let dots = [];

export function stopEditing() {
  dots.forEach(d => d.remove());
  dots = [];
}

// b = {coords, center, shape}: dragging a dot reshapes b.shape and updates b.coords and b.center.
export function editCorners(b) {
  stopEditing();
  const icon = L.divIcon({ className: "", html: '<div class="corner"></div>', iconSize: [20, 20], iconAnchor: [10, 10] });
  dots = b.coords.map((c, i) => L.marker(c, { draggable: true, icon, zIndexOffset: 2000 }).addTo(map)
    .on("drag", e => {
      b.coords[i] = [e.latlng.lat, e.latlng.lng];
      b.center = mid(b.coords);
      b.shape.setLatLngs(b.coords);
    }));
}
