// Panel to pick the map picture (street or satellite) and show or hide buildings.
import { $ } from "./dom.js";
import { currentBase, setBaseLayer } from "./mapView.js";
import { buildingsVisible, setBuildingsVisible } from "./buildingLayer.js";
import { openSheet, closeSheet } from "./sheet.js";

export function showLayers() {
  const on = n => (currentBase() === n ? "on" : "");
  openSheet(`<h2>Map layers</h2>
    <button class="opt ${on("street")}" data-base="street">Street map</button>
    <button class="opt ${on("satellite")}" data-base="satellite">Satellite</button>
    <button class="opt" id="bToggle">Building outlines <b>${buildingsVisible() ? "On" : "Off"}</b></button>
    <button class="big ghost" id="layersDone" style="min-height:48px">Done</button>`);
  document.querySelectorAll("[data-base]").forEach(b => { b.onclick = () => { setBaseLayer(b.dataset.base); showLayers(); }; });
  $("#bToggle").onclick = () => { setBuildingsVisible(!buildingsVisible()); showLayers(); };
  $("#layersDone").onclick = closeSheet;
}
