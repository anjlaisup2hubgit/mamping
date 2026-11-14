// Panel to pick the map picture (street or satellite) and show or hide buildings.
import { $ } from "./dom.js";
import { map, currentBase, setBaseLayer } from "./mapView.js";
import { state } from "../data/state.js";
import { TILE_URL, SATELLITE_TILE_URL } from "../data/config.js";
import { buildingsVisible, setBuildingsVisible, setNeedsHeight } from "./buildingLayer.js";
import { openSheet } from "./sheet.js";

// One map square at the middle of the screen, used as a small preview picture.
function preview(url) {
  const z = Math.min(Math.round(map.getZoom()), 17);
  const { x, y } = map.project(map.getCenter(), z).divideBy(256).floor();
  return L.Util.template(url, { z, x, y });
}

const card = (name, title, url) =>
  `<button class="base ${currentBase() === name ? "on" : ""}" data-base="${name}"><img src="${preview(url)}" alt=""><span>${title}</span></button>`;

export function showLayers() {
  const street = currentBase() === "street";
  openSheet(`<h2>Map layers</h2>
    <div class="bases">${card("street", "Street map", TILE_URL)}${card("satellite", "Satellite", SATELLITE_TILE_URL)}</div>
    ${street ? `<button class="opt" id="bToggle">Building outlines <b>${buildingsVisible() ? "On" : "Off"}</b></button>
    <button class="opt" id="nhToggle"><span>Show buildings missing a height <span class="mid" style="display:block;font-size:13px">Shown in blue, so you know what to film next</span></span><b>${state.needsHeight ? "On" : "Off"}</b></button>`
    : `<p class="mid" style="margin:0">Building outlines show on the street map only.</p>`}`);
  document.querySelectorAll("[data-base]").forEach(b => { b.onclick = () => { setBaseLayer(b.dataset.base); showLayers(); }; });
  if (!street) return;
  $("#bToggle").onclick = () => { setBuildingsVisible(!buildingsVisible()); showLayers(); };
  // the filter is useless with outlines hidden, so turning it on also shows them
  $("#nhToggle").onclick = () => { setNeedsHeight(!state.needsHeight); if (state.needsHeight) setBuildingsVisible(true); showLayers(); };
}
