// Map: search box at the bottom-left, and one bottom bar with all the map tools.
import { $ } from "../components/dom.js";
import { goMe } from "../components/mapView.js";
import { findMissing } from "../components/missingLayer.js";
import { bottomNav, bindNav } from "../components/bottomNav.js";
import { searchBar, bindSearch } from "../components/searchBar.js";
import { settingsMenu, bindSettingsMenu } from "../components/settingsMenu.js";
import { showLayers } from "../components/layersSheet.js";

export const map = {
  full: false,
  open(el) {
    el.innerHTML = searchBar() + settingsMenu() + bottomNav("map", true);
    bindNav(el);
    bindSearch();
    bindSettingsMenu();
    $("#layersB").onclick = showLayers;
    $("#goMe").onclick = goMe;
    $("#findMiss").onclick = findMissing;
  }
};
