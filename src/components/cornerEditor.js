// Handles on a missing-building outline so the user can fix a shape the AI got wrong.
// Orange dot = corner: drag to move, double-tap to remove. White dot = middle of an edge: drag to add a corner.
// Middle handle: drag to move the whole outline. Round arrow outside a wall: drag to slide that whole wall.
// Round handle above: drag to turn the outline (it clicks into line with the road or the house next door). Every change can be undone.
import { map } from "./mapView.js";
import { state } from "../data/state.js";
import { mid, squareUp } from "../data/geo.js";
import { pushWall, turn, bearing, snapTurn, sizeText } from "../data/shapeMoves.js";
import { wallAngle } from "../data/rectangle.js";
import { loadRoads, roadsNow } from "../data/roads.js";

let dots = [], current = null, past = [], onChange = null, lastTap = { i: -1, at: 0 }, watcher = null;

// watcher(b) runs whenever the shape being edited moves, and with null when editing stops (used by the floating tools).
export const watchShape = f => { watcher = f; };

export function stopEditing() {
  map.off("zoomend", redrawHandles);
  hush();
  dots.forEach(d => d.remove());
  dots = []; current = null; past = [];
  if (watcher) watcher(null);
}

const icon = (cls, size, deg = 0) => L.divIcon({ className: "corner-hit", html: `<div class="${cls}" style="transform:rotate(${deg}deg)"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const handle = (at, cls, size, z, deg) => { const d = L.marker(at, { draggable: true, icon: icon(cls, size, deg), zIndexOffset: z }).addTo(map); dots.push(d); return d; };
const redrawHandles = () => { if (current) draw(); }; // handles sit a fixed number of pixels off the shape, so place them again after zooming

// A spot `px` screen pixels out from point p, heading away from point from; deg = that direction for an up-pointing arrow.
function away(p, from, px) {
  const a = map.latLngToContainerPoint(p), b = map.latLngToContainerPoint(from), dx = a.x - b.x, dy = a.y - b.y, len = Math.hypot(dx, dy) || 1;
  const q = map.containerPointToLatLng([a.x + dx / len * px, a.y + dy / len * px]);
  return { at: [q.lat, q.lng], deg: Math.atan2(dx, -dy) * 180 / Math.PI };
}

// Little white label next to the finger while dragging (size or angle).
let tag = null;
function say(at, text) {
  tag ||= L.marker(at, { icon: L.divIcon({ className: "", html: '<div class="shapeTag"></div>', iconSize: [0, 0], iconAnchor: [-28, 44] }), interactive: false, zIndexOffset: 4000 }).addTo(map);
  tag.setLatLng(at);
  tag.getElement().firstChild.textContent = text;
}
function hush() { if (tag) tag.remove(); tag = null; }

function show(coords) { // redraws the outline while a handle is being dragged
  current.coords = coords;
  current.center = mid(coords);
  current.shape.setLatLngs(coords);
  if (watcher) watcher(current);
}
const remember = () => past.push(current.coords.map(c => [...c]));
function done() { hush(); draw(); if (onChange) onChange(current); }
const ll = e => [e.latlng.lat, e.latlng.lng];

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
  c.forEach((p, i) => { // round arrows outside each wall: slide the whole wall in or out
    const q = c[(i + 1) % c.length], spot = away([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], current.center, 30);
    let start = null;
    handle(spot.at, "push", 40, 1950, spot.deg)
      .on("dragstart", e => { remember(); start = { at: ll({ latlng: e.target.getLatLng() }), coords: c.map(x => [...x]) }; })
      .on("drag", e => { pushWall(start.coords, i, start.at, ll(e)).forEach((x, k) => { c[k] = x; }); show(c); say(e.latlng, sizeText(c)); })
      .on("dragend", done);
  });
  const top = map.latLngToContainerPoint(current.center), highest = Math.min(...c.map(p => map.latLngToContainerPoint(p).y));
  const knob = map.containerPointToLatLng([top.x, highest - 40]);
  let spin = null;
  handle(knob, "turn", 44, 2100) // round handle above the shape: turn it around its middle
    .on("dragstart", e => {
      remember();
      const centre = [...current.center], buildings = [...state.buildings.values()].map(b => b.coords);
      loadRoads(...centre);
      spin = { centre, coords: c.map(x => [...x]), from: bearing(centre, ll({ latlng: e.target.getLatLng() })), target: () => wallAngle(centre, roadsNow(), buildings) };
    })
    .on("drag", e => {
      const s = snapTurn(spin.coords, bearing(spin.centre, ll(e)) - spin.from, spin.target());
      turn(spin.coords, s.ang).forEach((x, k) => { c[k] = x; });
      show(c);
      say(e.latlng, `${Math.round(Math.abs(s.ang) * 180 / Math.PI)}°${s.lined ? " · lined up" : ""}`);
    })
    .on("dragend", done);
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
  map.on("zoomend", redrawHandles);
  draw();
  if (watcher) watcher(b);
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
