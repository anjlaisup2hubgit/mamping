// For buildings the AI missed: tap each roof corner on the map, then tap Done.
import { state } from "../data/state.js";
import { $ } from "./dom.js";
import { map, currentBase, setBaseLayer } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";

let pts = [], drawn = null, onDone = null;

function redraw() {
  drawn.clearLayers();
  L.polygon(pts, { color: "#E8470F", weight: 3, fillColor: "#E8470F", fillOpacity: 0.25 }).addTo(drawn); // closes the shape so you see the finished outline
  pts.forEach(p => L.circleMarker(p, { radius: 7, color: "#fff", weight: 3, fillColor: "#E8470F", fillOpacity: 1 }).addTo(drawn));
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
  if (pts.length < 3) return toast("Tap at least 3 corners.");
  const corners = pts;
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
  openSheet(`<div><h2>Draw a building</h2><p class="mid" style="margin:4px 0 0">Tap each corner of the roof on the map, going round in order.</p></div>
    <div class="row"><button class="big ghost" id="drBack" style="min-height:48px">Undo corner</button><button class="big primary" id="drDone" style="min-height:48px">Done</button></div>`);
  $("#drBack").onclick = () => { pts.pop(); redraw(); };
  $("#drDone").onclick = finish;
  $("#bsheet .x").addEventListener("click", stopDrawing); // closing the panel cancels drawing
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && state.drawing) stopDrawing(); });
