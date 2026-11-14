// "Copy": many houses are built the same size, so the user taps the middle of each matching roof
// and a same-size, same-angle copy of the outline lands there. Stays on until Done.
import { state } from "../data/state.js";
import { moveTo } from "../data/shapeMoves.js";
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";

let shape = null, ghost = null, placed = 0, onPlace = null;

const at = e => moveTo(shape, [e.latlng.lat, e.latlng.lng]);
function place(e) { onPlace(at(e)); placed++; $("#cpN").textContent = placed; }
function follow(e) { // on a computer, a dashed copy follows the mouse so you can see where it will land
  ghost ||= L.polygon(at(e), { color: "#fff", weight: 2, dashArray: "8 6", fillOpacity: 0.1, interactive: false }).addTo(map);
  ghost.setLatLngs(at(e));
}

export function stopCopying() {
  if (!shape) return;
  map.off("click", place).off("mousemove", follow);
  if (ghost) ghost.remove();
  shape = ghost = null;
  state.drawing = false;
  map.getContainer().classList.remove("drawing");
  closeSheet();
}

// coords = the outline to copy; placedFn(copyCoords) runs for every tap on the map.
export function startCopying(coords, placedFn) {
  stopCopying();
  shape = coords.map(p => [...p]); placed = 0; onPlace = placedFn;
  state.drawing = true; // taps go to the map, not to buildings under the finger
  map.getContainer().classList.add("drawing");
  map.on("click", place).on("mousemove", follow);
  openSheet(`<div><h2>Copy</h2><p class="mid" style="margin:4px 0 0">Tap the middle of each roof that matches. <b id="cpN">0</b> placed.</p></div>
    <div class="row"><button class="big primary" id="cpDone" style="min-height:48px">Done</button></div>`);
  $("#cpDone").onclick = stopCopying;
  $("#bsheet .x").addEventListener("click", stopCopying); // closing the panel ends copying
}

document.addEventListener("keydown", e => { if (e.key === "Escape") stopCopying(); });
