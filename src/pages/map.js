// Map: the home screen. Search box at the bottom, one bottom bar with all the map tools, account picture in the corner.
import { $ } from "../components/dom.js";
import { findMissing } from "../components/missingLayer.js";
import { bottomNav, bindNav } from "../components/bottomNav.js";
import { searchBar, bindSearch } from "../components/searchBar.js";
import { showLayers } from "../components/layersSheet.js";
import { accountBadge, bindAccountBadge } from "../components/accountBadge.js";
import { go } from "../components/router.js";

export const map = {
  full: false,
  open(el) {
    el.innerHTML = searchBar() + accountBadge() + bottomNav();
    bindNav(el);
    bindSearch();
    bindAccountBadge(el);
    $("#layersB").onclick = showLayers;
    $("#findMiss").onclick = findMissing;
    $("#settingsB").onclick = () => go("settings");
  }
};
