// For buildings the AI missed: tap each roof corner on the map, then tap Done.
// 2 taps = rectangle lined up with the road, 3 taps = rectangle at any angle, 4 or more = any shape.
import { state } from "../data/state.js";
import { mid } from "../data/geo.js";
import { loadRoads, roadsNow } from "../data/roads.js";
import { wallAngle, rectFrom2, rectFrom3 } from "../data/rectangle.js";
import { $ } from "./dom.js";
import { map, currentBase, setBaseLayer } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";

let pts = [], drawn = null, onDone = null;

// The outline the taps make so far: a rectangle for 2 or 3 taps, otherwise the taps as they are.
function shape() {
  if (pts.length === 2) {
    const buildings = [...state.buildings.values()].map(b => b.coords);
    return rectFrom2(pts[0], pts[1], wallAngle(mid(pts), roadsNow(), buildings));
  }
  if (pts.length === 3) return rectFrom3(...pts);
  return pts;
}

function redraw() {
  drawn.clearLayers();
  const out = shape();
  L.polygon(out, { color: "#E8470F", weight: 3, fillColor: "#E8470F", fillOpacity: 0.25 }).addTo(drawn); // closes the shape so you see the finished outline
  out.forEach(p => L.circleMarker(p, { radius: 5, color: "#222", weight: 2, fillColor: "#fff", fillOpacity: 1 }).addTo(drawn)); // white = filled in for you
  pts.forEach(p => L.circleMarker(p, { radius: 7, color: "#fff", weight: 3, fillColor: "#E8470F", fillOpacity: 1 }).addTo(drawn)); // orange = you tapped
}
const addPoint = e => { pts.push([e.latlng.lat, e.latlng.lng]); redraw(); };

export function stopDrawing() {
  map.off("click", addPoint);
  if (drawn) drawn.remove();
  drawn = null;
  state.drawing = false;
  map.getContainer().classList.remove("drawing");
}

function finish() {
  if (pts.length < 2) return toast("Tap at least 2 corners.");
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
  drawn = L.layerGroup().addTo(map);
  state.drawing = true;
  map.getContainer().classList.add("drawing");
  map.on("click", addPoint);
  const c = map.getCenter();
  loadRoads(c.lat, c.lng).then(() => { if (drawn && pts.length === 2) redraw(); }); // no roads: walls follow buildings or north
  openSheet(`<div><h2>Draw a building</h2><p class="mid" style="margin:4px 0 0">Tap 2 opposite corners for a rectangle, 3 for a tilted one (two along a wall, one on the far wall), or every corner, going round in order.</p></div>
    <div class="row"><button class="big ghost" id="drBack" style="min-height:48px">Undo corner</button><button class="big primary" id="drDone" style="min-height:48px">Done</button></div>`);
  $("#drBack").onclick = () => { pts.pop(); redraw(); };
  $("#drDone").onclick = finish;
  $("#bsheet .x").addEventListener("click", stopDrawing); // closing the panel cancels drawing
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && state.drawing) stopDrawing(); });
