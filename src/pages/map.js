// Map: search, layers, and find-missing buttons over the map.
import { $ } from "../components/dom.js";
import { go } from "../components/router.js";
import { goMe } from "../components/mapView.js";
import { findMissing } from "../components/missingLayer.js";
import { icons } from "../components/icons.js";
import { bottomNav, bindNav } from "../components/bottomNav.js";
import { searchBar, bindSearch } from "../components/searchBar.js";
import { showLayers } from "../components/layersSheet.js";

const side = (id, label, icon) => `<button class="round" id="${id}" aria-label="${label}" data-tip="${label}">${icon}</button>`;

export const map = {
  full: false,
  open(el) {
    el.innerHTML = searchBar() + `<div class="side">
      ${side("layersB", "Map layers", icons.layers)}${side("goMe", "My location", icons.locate)}${side("findMiss", "Find missing buildings", icons.scan)}${side("openHelp", "Help", icons.help)}${side("openSettings", "Settings", icons.settings)}</div>` + bottomNav("map");
    bindNav(el);
    bindSearch();
    $("#layersB").onclick = showLayers;
    $("#goMe").onclick = goMe;
    $("#findMiss").onclick = findMissing;
    $("#openHelp").onclick = () => go("help");
    $("#openSettings").onclick = () => go("settings");
  }
};
