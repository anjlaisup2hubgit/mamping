// Handles on a missing-building outline so the user can fix a shape the AI got wrong.
// Orange dot = corner: drag to move, double-tap to remove. White dot = middle of an edge: drag to add a corner.
// Middle handle: drag to move the whole outline. Every change can be undone.
import { map } from "./mapView.js";
import { mid, squareUp } from "../data/geo.js";

let dots = [], current = null, past = [], onChange = null, lastTap = { i: -1, at: 0 };

export function stopEditing() {
  dots.forEach(d => d.remove());
  dots = []; current = null; past = [];
}

const icon = (cls, size) => L.divIcon({ className: "corner-hit", html: `<div class="${cls}"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const handle = (at, cls, size, z) => { const d = L.marker(at, { draggable: true, icon: icon(cls, size), zIndexOffset: z }).addTo(map); dots.push(d); return d; };

function show(coords) { // redraws the outline while a handle is being dragged
  current.coords = coords;
  current.center = mid(coords);
  current.shape.setLatLngs(coords);
}
const remember = () => past.push(current.coords.map(c => [...c]));
function done() { draw(); if (onChange) onChange(current); }

function draw() {
  dots.forEach(d => d.remove());
  dots = [];
  const c = current.coords;
  c.forEach((p, i) => handle(p, "corner", 44, 2000)
    .on("dragstart", remember)
    .on("drag", e => { c[i] = [e.latlng.lat, e.latlng.lng]; show(c); })
    .on("dragend", done)
    .on("click", () => { // two taps on the same corner within 0.4 s removes it
      const now = Date.now();
      if (lastTap.i === i && now - lastTap.at < 400 && c.length > 3) { remember(); c.splice(i, 1); show(c); done(); lastTap = { i: -1, at: 0 }; } else lastTap = { i, at: now };
    }));
  c.forEach((p, i) => {
    const q = c[(i + 1) % c.length];
    handle([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], "corner add", 36, 1900)
      .on("dragstart", e => { remember(); const m = e.target.getLatLng(); c.splice(i + 1, 0, [m.lat, m.lng]); })
      .on("drag", e => { c[i + 1] = [e.latlng.lat, e.latlng.lng]; show(c); })
      .on("dragend", done);
  });
  let from = null;
  handle(current.center, "mover", 44, 2100)
    .on("dragstart", e => { remember(); from = { at: e.target.getLatLng(), coords: c.map(p => [...p]) }; })
    .on("drag", e => {
      const at = e.target.getLatLng(), dy = at.lat - from.at.lat, dx = at.lng - from.at.lng;
      from.coords.forEach((p, k) => { c[k] = [p[0] + dy, p[1] + dx]; });
      show(c);
    })
    .on("dragend", done);
}

// b = {coords, center, shape}. changed(b) runs after every finished change, e.g. to save it.
export function editCorners(b, changed) {
  stopEditing();
  current = b;
  onChange = changed;
  draw();
}

// Turns the outline into a neat rectangle. Returns false if nothing is being edited.
export function squareShape() {
  if (!current) return false;
  remember();
  show(squareUp(current.coords));
  done();
  return true;
}

// Goes back one change. Returns false if there is nothing to undo.
export function undoShape() {
  if (!current || !past.length) return false;
  show(past.pop());
  done();
  return true;
}
