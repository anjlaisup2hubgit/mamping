// Choosing which satellite pictures to scan. Every picture on the screen shows as a square;
// tap a square to pick it (blue, numbered), tap again to unpick. Move or zoom the map to see more squares.
import { state } from "../data/state.js";
import { pictureSquares } from "../data/satellite.js";
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";

const MIN_ZOOM = 17; // further out, the squares are too small to tap
let layer = null, hint = null, redraw = null;

export function stopPicking() {
  [layer, hint].forEach(x => x && x.remove());
  if (redraw) map.off("moveend", redraw);
  layer = null; hint = null; redraw = null;
  state.picking = false;
  document.body.classList.remove("picking");
}

const number = n => L.divIcon({ className: "", html: `<div class="sqnum">${n}</div>`, iconSize: [24, 24], iconAnchor: [-6, -6] });
const key = p => p.nw.join(); // names a square, so it stays picked while the map moves
const PICKED = { className: "sq", color: "#fff", weight: 2, fillColor: "#1F6FEB", fillOpacity: 0.35 };
const FREE = { className: "sq", color: "#fff", weight: 1, dashArray: "4 4", fillColor: "#fff", fillOpacity: 0.05 };

// onScan(bounds, squares) runs with the picked squares and a box around them. maxPictures = the most one scan reads.
export function pickArea(onScan, maxPictures) {
  stopPicking();
  state.picking = true;
  document.body.classList.add("picking"); // also hides the bottom buttons behind the bar
  layer = L.layerGroup().addTo(map);
  hint = L.DomUtil.create("div", "pickHint", map.getContainer());
  const picked = new Map(); // key -> square, in the order they were tapped

  const update = () => {
    layer.clearLayers();
    const close = map.getZoom() >= MIN_ZOOM;
    hint.textContent = close ? `Tap the pictures to scan (up to ${maxPictures}).` : "Zoom in to see the pictures.";
    const squares = close ? pictureSquares(map.getBounds()) : [];
    squares.forEach(p => {
      const on = picked.has(key(p));
      L.rectangle([p.nw, p.se], on ? PICKED : FREE).on("click", e => { L.DomEvent.stopPropagation(e); tap(p); }).addTo(layer);
    });
    [...picked.values()].forEach((p, i) => L.marker(p.nw, { icon: number(i + 1), interactive: false }).addTo(layer));
    const n = picked.size, btn = $("#scanArea");
    if (btn) { btn.disabled = !n; btn.textContent = n ? `Scan ${n} picture${n > 1 ? "s" : ""}` : "Tap pictures to scan"; }
  };
  const tap = p => {
    if (picked.has(key(p))) picked.delete(key(p));
    else if (picked.size >= maxPictures) return toast(`Up to ${maxPictures} at once. Tap a blue one to unpick it first.`);
    else picked.set(key(p), p);
    update();
  };
  redraw = update;
  map.on("moveend", redraw);

  openSheet(`<button class="primary pill" id="scanArea"></button>`, true);
  update();
  $("#scanArea").onclick = () => {
    const chosen = [...picked.values()];
    const box = L.latLngBounds(chosen.flatMap(p => [p.nw, p.se]));
    stopPicking(); closeSheet(); onScan(box, chosen);
  };
  $("#bsheet .x").addEventListener("click", stopPicking); // closing the panel cancels
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && state.picking) stopPicking(); });
