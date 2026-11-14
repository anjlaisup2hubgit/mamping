// A blue box on the map to choose which area to scan. Drag its corners to resize it, or its middle to move it.
// The panel says how many satellite pictures the AI will read, so people with a slow or limited AI can keep it small.
import { state } from "../data/state.js";
import { viewCentres } from "../data/satellite.js";
import { $ } from "./dom.js";
import { map } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";

let box = null, handles = [];

export function stopPicking() {
  if (box) box.remove();
  handles.forEach(h => h.remove());
  box = null; handles = [];
  state.picking = false;
  map.getContainer().classList.remove("picking");
}

const icon = cls => L.divIcon({ className: "corner-hit", html: `<div class="${cls}"></div>`, iconSize: [44, 44], iconAnchor: [22, 22] });

// How many pictures the area needs, and a warning if that is more than the scan reads.
function countText(maxPictures) {
  const n = viewCentres(box.getBounds(), Infinity).length;
  return n <= maxPictures
    ? `The AI will read ${n} satellite picture${n > 1 ? "s" : ""}.`
    : `This area needs ${n} pictures, but a scan reads only the middle ${maxPictures}. Make the box smaller to cover all of it.`;
}

// onScan(bounds) runs with the chosen area. maxPictures = the most pictures one scan reads.
export function pickArea(onScan, maxPictures) {
  stopPicking();
  state.picking = true;
  map.getContainer().classList.add("picking");
  const { x: w, y: h } = map.getSize(); // start in the upper part of the screen, so the panel does not cover a corner
  const view = L.latLngBounds(map.containerPointToLatLng([w * 0.2, h * 0.1]), map.containerPointToLatLng([w * 0.8, h * 0.45]));
  box = L.rectangle(view, { color: "#1F6FEB", weight: 2, dashArray: "6 6", fillOpacity: 0.08, interactive: false }).addTo(map);
  let nw = view.getNorthWest(), se = view.getSouthEast();
  const update = () => {
    box.setBounds(L.latLngBounds(nw, se));
    handles[0].setLatLng(nw); handles[1].setLatLng(se); handles[2].setLatLng(box.getBounds().getCenter());
    if ($("#areaCount")) $("#areaCount").textContent = countText(maxPictures);
  };
  const handle = (at, cls) => { const h = L.marker(at, { draggable: true, icon: icon(cls), zIndexOffset: 2000 }).addTo(map); handles.push(h); return h; };
  handle(nw, "corner").on("drag", e => { nw = e.latlng; update(); });
  handle(se, "corner").on("drag", e => { se = e.latlng; update(); });
  let from = null;
  handle(view.getCenter(), "mover")
    .on("dragstart", e => { from = { at: e.target.getLatLng(), nw, se }; })
    .on("drag", e => {
      const at = e.target.getLatLng(), dy = at.lat - from.at.lat, dx = at.lng - from.at.lng;
      nw = L.latLng(from.nw.lat + dy, from.nw.lng + dx); se = L.latLng(from.se.lat + dy, from.se.lng + dx);
      update();
    });
  openSheet(`<div><h2>Choose the area to scan</h2><p class="mid" style="margin:4px 0 0">Drag the corners of the blue box to fit the area. A smaller area is faster and asks less of the AI.</p></div>
    <p class="mid" id="areaCount" style="margin:0;font-weight:600;color:var(--ink)">${countText(maxPictures)}</p>
    <button class="big primary" id="scanArea" style="min-height:48px">Scan this area</button>
    <button class="big ghost" id="scanAll" style="min-height:48px">Scan the whole screen</button>`);
  const go = bounds => { stopPicking(); closeSheet(); onScan(bounds); };
  $("#scanArea").onclick = () => go(L.latLngBounds(nw, se));
  $("#scanAll").onclick = () => go(map.getBounds());
  $("#bsheet .x").addEventListener("click", stopPicking); // closing the panel cancels
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && state.picking) stopPicking(); });
