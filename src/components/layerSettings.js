// Settings rows that show or hide building outlines and highlight buildings missing details.
import { state } from "../data/state.js";
import { buildingsVisible, setBuildingsVisible, setNeedsHeight } from "./buildingLayer.js";
import { icons } from "./icons.js";
import { getSettings, saveSetting } from "../data/settings.js";
import { syncSharpPhotos } from "./sharpPhotos.js";

const toggle = (id, icon, title, sub, on) =>
  `<button class="lrow" id="${id}" aria-pressed="${on}"><span class="lic">${icon}</span><span class="who"><b>${title}</b><span class="mid">${sub}</span></span><b class="onOff">${on ? "On" : "Off"}</b></button>`;

export const layerSettings = () =>
  toggle("bToggle", icons.outline, "Building outlines", "Shown on the street map", buildingsVisible()) +
  toggle("nhToggle", icons.building, "Highlight missing details", "Yellow needs a height, blue is done", state.needsHeight) +
  toggle("sharpToggle", icons.photo, "Sharper photos", "Clearer satellite close up; may invent small details", getSettings().sharpPhotos);

export function bindLayerSettings(el, redraw) {
  el.querySelector("#bToggle").onclick = () => { setBuildingsVisible(!buildingsVisible()); redraw(); };
  // the highlight is useless with outlines hidden, so turning it on also shows them
  el.querySelector("#nhToggle").onclick = () => { setNeedsHeight(!state.needsHeight); if (state.needsHeight) setBuildingsVisible(true); redraw(); };
  el.querySelector("#sharpToggle").onclick = () => { saveSetting("sharpPhotos", !getSettings().sharpPhotos); syncSharpPhotos(); redraw(); };
}
