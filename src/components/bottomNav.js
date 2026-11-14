// Bottom bar on the map (the home screen): map tools with the big camera button in the middle.
import { go } from "./router.js";
import { icons } from "./icons.js";

const tool = (id, label, icon) => `<button class="navb" id="${id}" aria-label="${label}" data-tip="${label}">${icon}</button>`;

const cam = `<button class="navcam" data-to="camera" id="navCam" aria-label="Take video" data-tip="Take video">${icons.camera}</button>`;

// The camera sits inside the gap so it never covers a neighbour button.
export const bottomNav = () => `<nav class="nav tools" aria-label="Main">
  ${tool("searchB", "Search a place", icons.search) + tool("layersB", "Map layers", icons.layers) + `<span class="navgap">${cam}</span>` + tool("findMiss", "Find missing buildings", icons.scan) + tool("settingsB", "Settings", icons.settings)}</nav>`;

export function bindNav(el) {
  el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
}
