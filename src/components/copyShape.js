// "Copy": many houses are built the same size, so the user taps the middle of each matching roof
// and a same-size, same-angle copy of the outline lands there. Stays on until "Stop copying", Esc or a right-click.
import { state } from "../data/state.js";
import { moveTo } from "../data/shapeMoves.js";
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { closeSheet } from "./sheet.js";
import { toast } from "./toast.js";

let shape = null, ghost = null, hint = null, bar = null, placed = 0, onPlace = null, rightAt = null;

const at = e => moveTo(shape, [e.latlng.lat, e.latlng.lng]);
function place(e) { onPlace(at(e)); placed++; $("#cpN").textContent = placed; }
function follow(e) { // on a computer, a dashed copy and a short hint follow the mouse so you can see where it will land
  ghost ||= L.polygon(at(e), { color: "#fff", weight: 1.5, dashArray: "6 5", fillOpacity: 0.1, interactive: false }).addTo(map);
  ghost.setLatLngs(at(e));
  hint ||= L.marker(e.latlng, { icon: L.divIcon({ className: "", html: '<div class="copyHint">Click to drop · Esc to stop</div>', iconSize: [0, 0], iconAnchor: [-16, 36] }), interactive: false, zIndexOffset: 4000 }).addTo(map);
  hint.setLatLng(e.latlng);
}

// A right-click that does not move stops copying (a right-drag still tilts the map).
const rightDown = e => { if (e.button === 2) rightAt = [e.clientX, e.clientY]; };
const rightUp = e => { if (e.button === 2 && rightAt && Math.hypot(e.clientX - rightAt[0], e.clientY - rightAt[1]) < 5) stopCopying(); rightAt = null; };

export function stopCopying() {
  if (!shape) return;
  map.off("click", place).off("mousemove", follow);
  const el = map.getContainer();
  el.removeEventListener("mousedown", rightDown);
  el.removeEventListener("mouseup", rightUp);
  [ghost, hint].forEach(x => x && x.remove());
  bar.remove();
  shape = ghost = hint = bar = null;
  state.drawing = false;
  el.classList.remove("drawing");
  if (placed) toast(`${placed} ${placed === 1 ? "copy" : "copies"} added`);
}

// coords = the outline to copy; placedFn(copyCoords) runs for every tap on the map.
export function startCopying(coords, placedFn) {
  stopCopying();
  closeSheet();
  shape = coords.map(p => [...p]); placed = 0; onPlace = placedFn;
  state.drawing = true; // taps go to the map, not to buildings under the finger
  const el = map.getContainer();
  el.classList.add("drawing");
  map.on("click", place).on("mousemove", follow);
  el.addEventListener("mousedown", rightDown);
  el.addEventListener("mouseup", rightUp);
  bar = document.createElement("div"); // banner at the top, where you are already looking
  bar.className = "copyBar";
  bar.innerHTML = `<svg viewBox="0 0 24 24"><rect x="4" y="8" width="12" height="12" rx="1.5"/><path d="M8 8V4h12v12h-4"/></svg>
    <span>Copying · <b id="cpN">0</b> placed</span>
    <button id="cpStop"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>Stop copying</button>`;
  document.body.appendChild(bar);
  $("#cpStop").onclick = stopCopying;
}

document.addEventListener("keydown", e => { if (e.key === "Escape") stopCopying(); });
