// Choosing which satellite pictures to scan. Every picture on the screen shows as a square;
// tap a square to pick it (blue, numbered), tap again to unpick. Move or zoom the map to see more squares.
// Each square also shows how many buildings OpenStreetMap already has in it; well-mapped ones are green,
// and picked squares can be saved for AI training with those buildings as the answers.
import { state } from "../data/state.js";
import { pictureSquares } from "../data/satellite.js";
import { buildingsIn } from "../data/buildings.js";
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { loadBuildings } from "./buildingLayer.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";

const MIN_ZOOM = 17; // further out, the squares are too small to tap
const MAX_PICKED = 30; // the most squares picked at once (saving for training can take more than one scan reads)
const MAPPED_FROM = 20; // a square with this many mapped buildings shows green
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
const MAPPED = { className: "sq", color: "#fff", weight: 1, fillColor: "#2EA043", fillOpacity: 0.35 };
const mappedCount = n => L.divIcon({ className: "", html: `<div class="sqcount">${n}</div>`, iconSize: [0, 0] });
const FREE = { className: "sq", color: "#fff", weight: 1, dashArray: "4 4", fillColor: "#fff", fillOpacity: 0.05 };

// onScan(bounds, squares) runs with the picked squares and a box around them. maxPictures = the most one scan reads.
export function pickArea(onScan, maxPictures) {
  stopPicking();
  state.picking = true;
  document.body.classList.add("picking"); // also hides the bottom buttons behind the bar
  layer = L.layerGroup().addTo(map);
  hint = L.DomUtil.create("div", "pickHint", map.getContainer());
  const picked = new Map(); // key -> square, in the order they were tapped

  const paint = () => {
    if (!layer) return; // picking was closed while buildings were loading
    layer.clearLayers();
    const close = map.getZoom() >= MIN_ZOOM;
    hint.textContent = close ? "Tap pictures to pick them. Green = already mapped." : "Zoom in to see the pictures.";
    const squares = close ? pictureSquares(map.getBounds()) : [];
    squares.forEach(p => {
      const on = picked.has(key(p)), mapped = buildingsIn(p).length;
      if (mapped) L.marker(p.centre, { icon: mappedCount(mapped), interactive: false }).addTo(layer);
      L.rectangle([p.nw, p.se], on ? PICKED : mapped >= MAPPED_FROM ? MAPPED : FREE).on("click", e => { L.DomEvent.stopPropagation(e); tap(p); }).addTo(layer);
    });
    [...picked.values()].forEach((p, i) => L.marker(p.nw, { icon: number(i + 1), interactive: false }).addTo(layer));
    const n = picked.size, btn = $("#scanArea");
    if (btn) { btn.disabled = !n || n > maxPictures; btn.textContent = n > maxPictures ? `Use AI to scan (up to ${maxPictures})` : n ? `Use AI to scan ${n} picture${n > 1 ? "s" : ""}` : "Tap pictures to scan"; }
  };
  const update = () => { paint(); loadBuildings().then(paint); }; // paint again once this part of the map has its buildings
  const tap = p => {
    if (picked.has(key(p))) picked.delete(key(p));
    else if (picked.size >= MAX_PICKED) return toast(`Up to ${MAX_PICKED} at once. Tap a blue one to unpick it first.`);
    else picked.set(key(p), p);
    paint();
  };
  redraw = update;
  map.on("moveend", redraw);

  openSheet(`<button class="primary pill" id="scanArea" style="flex:1"></button>`, true); // the button fills the bar
  update();
  $("#scanArea").onclick = () => {
    const chosen = [...picked.values()];
    const box = L.latLngBounds(chosen.flatMap(p => [p.nw, p.se]));
    stopPicking(); closeSheet(); onScan(box, chosen);
  };
  $("#bsheet .x").addEventListener("click", stopPicking); // closing the panel cancels
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && state.picking) stopPicking(); });
