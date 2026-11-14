// Choosing which area to scan. The box is made of squares, one per satellite picture the AI reads,
// so what you see is exactly what gets scanned. Drag a corner to add or remove squares, or the middle to move it.
// Squares over the limit turn grey: they are skipped. A short bar at the bottom keeps the map visible.
import { state } from "../data/state.js";
import { pictureSquares, snapToPictures } from "../data/satellite.js";
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";

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

// Draws the squares: blue and numbered = read, grey = skipped. Returns how many squares the box has.
function drawSquares(box, max) {
  layer.clearLayers();
  const ring = [box.getNorthWest(), box.getNorthEast(), box.getSouthEast(), box.getSouthWest()];
  L.polygon([WORLD, ring], { stroke: false, fillColor: "#000", fillOpacity: 0.35, interactive: false }).addTo(layer); // dim outside
  const squares = pictureSquares(box), read = squares.slice(0, max);
  squares.forEach((p, i) => L.rectangle([p.nw, p.se], i < max
    ? { color: "#fff", weight: 1.5, fillColor: "#1F6FEB", fillOpacity: 0.12, interactive: false }
    : { color: "#fff", weight: 1.5, dashArray: "6 6", fillColor: "#777", fillOpacity: 0.55, interactive: false }).addTo(layer));
  read.sort((a, b) => b.nw[0] - a.nw[0] || a.nw[1] - b.nw[1]) // number them in reading order
    .forEach((p, i) => L.marker(p.nw, { icon: number(i + 1), interactive: false }).addTo(layer));
  L.rectangle(box, { color: "#1F6FEB", weight: 3, fill: false, interactive: false }).addTo(layer);
  return squares.length;
}

const countText = (n, max) => n <= max ? `${n} picture${n > 1 ? "s" : ""}` : `${max} pictures, ${n - max} skipped`;

// onScan(bounds) runs with the chosen area. maxPictures = the most pictures one scan reads.
export function pickArea(onScan, maxPictures) {
  stopPicking();
  state.picking = true;
  document.body.classList.add("picking"); // also hides the bottom buttons behind the bar
  layer = L.layerGroup().addTo(map);
  hint = L.DomUtil.create("div", "pickHint", map.getContainer());
  hint.textContent = "Drag a corner. Each square is one picture the AI reads.";
  const { x: w, y: h } = map.getSize(); // start small, in the upper part of the screen
  let nw = map.containerPointToLatLng([w * 0.4, h * 0.25]), se = map.containerPointToLatLng([w * 0.6, h * 0.4]), box;
  const handle = (cls) => { const m = L.marker(nw, { draggable: true, icon: icon(cls), zIndexOffset: 2000 }).addTo(map); handles.push(m); return m; };
  const [a, b, mid] = [handle("corner"), handle("corner"), handle("mover")];
  const update = dragging => {
    box = L.latLngBounds(snapToPictures(L.latLngBounds(nw, se)));
    const n = drawSquares(box, maxPictures);
    if (dragging !== a) a.setLatLng(box.getNorthWest());
    if (dragging !== b) b.setLatLng(box.getSouthEast());
    if (dragging !== mid) mid.setLatLng(box.getCenter());
    if ($("#areaCount")) $("#areaCount").textContent = countText(n, maxPictures);
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
  openSheet(`<div class="barCount"><b id="areaCount"></b><span class="mid">Most per scan: ${maxPictures}</span></div>
    <button class="primary pill" id="scanArea">Scan these</button>
    <button class="ghost pill" id="scanAll">Whole screen</button>`, true);
  update();
  const go = bounds => { stopPicking(); closeSheet(); onScan(bounds); };
  $("#scanArea").onclick = () => go(box);
  $("#scanAll").onclick = () => go(map.getBounds());
  $("#bsheet .x").addEventListener("click", stopPicking); // closing the panel cancels
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && state.picking) stopPicking(); });
