// For buildings the AI missed: tap each roof corner on the map, then tap Done.
// 2 taps = rectangle lined up with the road, 3 taps = rectangle at any angle, 4 or more = any shape.
import { state } from "../data/state.js";
import { mid } from "../data/geo.js";
import { loadRoads, roadsNow, roadReach } from "../data/roads.js";
import { wallAngle, rectFrom2, rectFrom3 } from "../data/rectangle.js";
import { sizeText } from "../data/shapeMoves.js";
import { pickStreet } from "./streetPicker.js";
import { $ } from "./dom.js";
import { map, currentBase, setBaseLayer } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";

let pts = [], drawn = null, onDone = null;

// The outline the taps make so far: a rectangle for 2 or 3 taps, otherwise the taps as they are.
function shape() {
  if (pts.length === 2) {
    const buildings = [...state.buildings.values()].map(b => b.coords);
    return rectFrom2(pts[0], pts[1], wallAngle(mid(pts), roadsNow(), buildings, roadReach()));
  }
  if (pts.length === 3) return rectFrom3(...pts);
  return pts;
}

// What to do next, in a few words, for each number of taps.
function hint() {
  const n = pts.length, size = n > 1 ? ` · ${sizeText(shape())}` : "";
  if (n === 0) return ["Tap a roof corner", "Zoom in so the roof fills the screen."];
  if (n === 1) return ["Tap the opposite corner", "Diagonally across the roof."];
  if (n === 2) return [`Rectangle${size}`, "Done, or tap a 3rd corner to tilt it."];
  if (n === 3) return [`Tilted rectangle${size}`, "Done, or keep tapping every corner."];
  return [`${n} corners${size}`, "Done once you have gone all the way round."];
}

function redraw() {
  drawn.clearLayers();
  const out = shape();
  if (out.length) L.polygon(out, { color: "#E8470F", weight: 3, fillColor: "#E8470F", fillOpacity: 0.25 }).addTo(drawn); // closes the shape so you see the finished outline
  out.forEach(p => L.circleMarker(p, { radius: 5, color: "#222", weight: 2, fillColor: "#fff", fillOpacity: 1 }).addTo(drawn)); // white = filled in for you
  pts.forEach(p => L.circleMarker(p, { radius: 7, color: "#fff", weight: 3, fillColor: "#E8470F", fillOpacity: 1 }).addTo(drawn)); // orange = you tapped
  const [title, next] = hint();
  $("#drTitle").textContent = title;
  $("#drNext").textContent = next;
  $("#drBack").disabled = !pts.length;
  $("#drDone").disabled = pts.length < 2;
}
const addPoint = e => { if (state.picking) return; pts.push([e.latlng.lat, e.latlng.lng]); redraw(); };

export const cornersTapped = () => pts.length;

export function stopDrawing() {
  map.off("click", addPoint);
  if (drawn) drawn.remove();
  drawn = null;
  state.drawing = false;
  map.getContainer().classList.remove("drawing");
  document.body.classList.remove("drawingOutline");
  $("#bsheet").classList.remove("drawSheet");
}

function finish() {
  const corners = shape();
  stopDrawing();
  closeSheet();
  onDone(corners);
}

// done(corners) gets the [lat, lng] corners once the user taps Done.
export function startDrawing(done) {
  stopDrawing();
  pts = []; onDone = done;
  if (currentBase() !== "satellite") setBaseLayer("satellite"); // roofs are easiest to see from above
  if (map.getZoom() < 19) map.setZoom(Math.min(19, map.getMaxZoom())); // corners are hard to hit on tiny roofs
  drawn = L.layerGroup().addTo(map);
  state.drawing = true;
  map.getContainer().classList.add("drawing");
  document.body.classList.add("drawingOutline"); // hides the search and map buttons so the whole roof can be tapped
  const c = map.getCenter();
  loadRoads(c.lat, c.lng).then(() => { if (drawn && pts.length === 2) redraw(); }); // no roads: walls follow buildings or north
  openSheet(`<div class="drHint"><b id="drTitle"></b><span id="drNext"></span></div>
    <div class="drTools"><button class="ghost" id="drBack">↶ Undo</button><button class="ghost" id="drStreet">Street</button><button class="primary" id="drDone">✓ Done</button></div>`);
  $("#bsheet").classList.add("drawSheet");
  $("#drStreet").onclick = () => pickStreet(() => { if (drawn) redraw(); }); // while picking, the street tap does not add a corner
  $("#drBack").onclick = () => { pts.pop(); redraw(); };
  $("#drDone").onclick = finish;
  $("#bsheet .x").addEventListener("click", stopDrawing); // closing the panel cancels drawing
  map.on("click", addPoint);
  redraw();
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && state.drawing) stopDrawing(); });
