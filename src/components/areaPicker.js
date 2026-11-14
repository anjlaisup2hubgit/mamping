// Choosing which area to scan. The box is made of squares, one per satellite picture the AI reads,
// so what you see is exactly what gets scanned. Drag a corner to add or remove squares, or the middle to move it.
// Tap a square to skip it (grey) or take it back (blue). Only blue squares are scanned.
import { state } from "../data/state.js";
import { pictureSquares, snapToPictures } from "../data/satellite.js";
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";

let layer = null, handles = [], hint = null;

export function stopPicking() {
  [layer, hint, ...handles].forEach(x => x && x.remove());
  layer = null; hint = null; handles = [];
  state.picking = false;
  document.body.classList.remove("picking");
}

const icon = cls => L.divIcon({ className: "corner-hit", html: `<div class="${cls}"></div>`, iconSize: [44, 44], iconAnchor: [22, 22] });
const number = n => L.divIcon({ className: "", html: `<div class="sqnum">${n}</div>`, iconSize: [24, 24], iconAnchor: [-6, -6] });
const WORLD = [[-85, -180], [-85, 180], [85, 180], [85, -180]];

const key = p => p.nw.join(); // names a square, so a skipped one stays skipped while the box changes

// Draws the squares: blue and numbered = read, grey = skipped. Tapping one runs onTap(square, isBlue).
// Returns the blue squares.
function drawSquares(box, max, off, onTap) {
  layer.clearLayers();
  const ring = [box.getNorthWest(), box.getNorthEast(), box.getSouthEast(), box.getSouthWest()];
  L.polygon([WORLD, ring], { stroke: false, fillColor: "#000", fillOpacity: 0.35, interactive: false }).addTo(layer); // dim outside
  const squares = pictureSquares(box), read = squares.filter(p => !off.has(key(p))).slice(0, max);
  squares.forEach(p => {
    const blue = read.includes(p);
    L.rectangle([p.nw, p.se], blue
      ? { color: "#fff", weight: 1.5, fillColor: "#1F6FEB", fillOpacity: 0.12 }
      : { color: "#fff", weight: 1.5, dashArray: "6 6", fillColor: "#777", fillOpacity: 0.55 })
      .on("click", e => { L.DomEvent.stopPropagation(e); onTap(p, blue); }).addTo(layer);
  });
  [...read].sort((a, b) => b.nw[0] - a.nw[0] || a.nw[1] - b.nw[1]) // number them in reading order
    .forEach((p, i) => L.marker(p.nw, { icon: number(i + 1), interactive: false }).addTo(layer));
  L.rectangle(box, { color: "#1F6FEB", weight: 3, fill: false, interactive: false }).addTo(layer);
  return read;
}

// onScan(bounds, squares) runs with the chosen box and its blue squares. maxPictures = the most pictures one scan reads.
export function pickArea(onScan, maxPictures) {
  stopPicking();
  state.picking = true;
  document.body.classList.add("picking"); // also hides the bottom buttons behind the bar
  layer = L.layerGroup().addTo(map);
  hint = L.DomUtil.create("div", "pickHint", map.getContainer());
  hint.textContent = "Drag a corner. Tap a square to skip it.";
  const { x: w, y: h } = map.getSize(); // start small, in the upper part of the screen
  let nw = map.containerPointToLatLng([w * 0.4, h * 0.25]), se = map.containerPointToLatLng([w * 0.6, h * 0.4]), box, read = [];
  const off = new Set(); // squares the user tapped to skip
  const handle = (cls) => { const m = L.marker(nw, { draggable: true, icon: icon(cls), zIndexOffset: 2000 }).addTo(map); handles.push(m); return m; };
  const [a, b, mid] = [handle("corner"), handle("corner"), handle("mover")];
  const update = dragging => {
    box = L.latLngBounds(snapToPictures(L.latLngBounds(nw, se)));
    read = drawSquares(box, maxPictures, off, tap);
    if (dragging !== a) a.setLatLng(box.getNorthWest());
    if (dragging !== b) b.setLatLng(box.getSouthEast());
    if (dragging !== mid) mid.setLatLng(box.getCenter());
    if ($("#scanArea")) $("#scanArea").disabled = !read.length;
  };
  const tap = (p, blue) => {
    if (blue) off.add(key(p));
    else if (read.length >= maxPictures) return toast(`Up to ${maxPictures} at once. Tap a blue square to skip it first.`);
    else off.delete(key(p));
    update();
  };
  const settle = () => { nw = box.getNorthWest(); se = box.getSouthEast(); update(); }; // handles jump to the square edges
  a.on("drag", e => { nw = e.latlng; update(a); }).on("dragend", settle);
  b.on("drag", e => { se = e.latlng; update(b); }).on("dragend", settle);
  let from = null;
  mid.on("dragstart", e => { from = { at: e.target.getLatLng(), nw, se }; })
    .on("drag", e => {
      const at = e.target.getLatLng(), dy = at.lat - from.at.lat, dx = at.lng - from.at.lng;
      nw = L.latLng(from.nw.lat + dy, from.nw.lng + dx); se = L.latLng(from.se.lat + dy, from.se.lng + dx);
      update(mid);
    }).on("dragend", settle);
  openSheet(`<button class="primary pill" id="scanArea">Scan</button>`, true);
  update();
  $("#scanArea").onclick = () => { const chosen = read; stopPicking(); closeSheet(); onScan(box, chosen); };
  $("#bsheet .x").addEventListener("click", stopPicking); // closing the panel cancels
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && state.picking) stopPicking(); });
