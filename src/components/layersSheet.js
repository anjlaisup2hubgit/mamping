// Panel to pick the map picture (street or satellite) and show or hide buildings.
import { $ } from "./dom.js";
import { currentBase, setBaseLayer } from "./mapView.js";
import { state } from "../data/state.js";
import { buildingsVisible, setBuildingsVisible, setNeedsHeight } from "./buildingLayer.js";
import { openSheet } from "./sheet.js";

export function showLayers() {
  const on = n => (currentBase() === n ? "on" : "");
  openSheet(`<h2>Map layers</h2>
    <button class="opt ${on("street")}" data-base="street">Street map</button>
    <button class="opt ${on("satellite")}" data-base="satellite">Satellite</button>
    <button class="opt" id="bToggle">Building outlines <b>${buildingsVisible() ? "On" : "Off"}</b></button>
    <button class="opt" id="nhToggle"><span>Show buildings missing a height <span class="mid" style="display:block;font-size:13px">Shown in blue, so you know what to film next</span></span><b>${state.needsHeight ? "On" : "Off"}</b></button>`);
  document.querySelectorAll("[data-base]").forEach(b => { b.onclick = () => { setBaseLayer(b.dataset.base); showLayers(); }; });
  $("#bToggle").onclick = () => { setBuildingsVisible(!buildingsVisible()); showLayers(); };
  // the filter is useless with outlines hidden, so turning it on also shows them
  $("#nhToggle").onclick = () => { setNeedsHeight(!state.needsHeight); if (state.needsHeight) setBuildingsVisible(true); showLayers(); };
}
