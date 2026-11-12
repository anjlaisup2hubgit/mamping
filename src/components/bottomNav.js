// Bottom bar: Map, big camera button. On the map page it also holds the map tools.
import { go } from "./router.js";
import { icons } from "./icons.js";

const btn = (to, label, icon, on) => `<button class="navb ${on ? "on" : ""}" data-to="${to}" aria-label="${label}" data-tip="${label}">${icon}</button>`;
const tool = (id, label, icon) => `<button class="navb" id="${id}" aria-label="${label}" data-tip="${label}">${icon}</button>`;

const cam = `<button class="navcam" data-to="camera" id="navCam" aria-label="Take video" data-tip="Take video">${icons.camera}</button>`;

// With tools, the camera sits inside the gap so it never covers a neighbour button.
export const bottomNav = (active, withTools = false) => `<nav class="nav ${withTools ? "tools" : ""}" aria-label="Main">
  ${btn("map", "Map", icons.map, active === "map")}${withTools ? tool("searchB", "Search a place", icons.search) + tool("layersB", "Map layers", icons.layers) + `<span class="navgap">${cam}</span>` + tool("goMe", "My location", icons.locate) + tool("findMiss", "Find missing buildings", icons.scan) + tool("settingsB", "Settings", icons.settings) : cam}</nav>`;

export function bindNav(el) {
  el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
}
