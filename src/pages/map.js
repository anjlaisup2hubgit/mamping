// Explore: one row of tools above the map, stacked at the top on phones.
import { $ } from "../components/dom.js";
import { findMissing } from "../components/missingLayer.js";
import { bottomNav, bindNav } from "../components/bottomNav.js";
import { searchBar, bindSearch } from "../components/searchBar.js";
import { showLayers } from "../components/layersSheet.js";
import { accountBadge, bindAccountBadge } from "../components/accountBadge.js";
import { icons } from "../components/icons.js";
import { map as liveMap, setBaseLayer, currentBase, centerOn } from "../components/mapView.js";
import { state } from "../data/state.js";
import { toast } from "../components/toast.js";

let stop = null;

export const map = {
  full: false,
  open(el) {
    el.innerHTML = `<header class="masthead" aria-label="Map workspace">
      <div class="profileSlot">${accountBadge() || `<button class="profileButton" data-to="settings" aria-label="Your account">${icons.person}</button>`}</div>
      ${bottomNav()}<div class="searchSlot">${searchBar()}</div>
      <div class="contributionActions" role="group" aria-label="Contribute to the map"><button class="big primary" data-to="camera" id="navCam">${icons.camera}<span>Capture a building</span></button><button class="big ghost" id="findMiss">${icons.scan}<span>Find missing buildings</span></button></div></header>
      <div class="mapToolbar"><div class="baseToggle" role="group" aria-label="Base map"><button data-base="street">Street</button><button data-base="satellite">Satellite</button></div><button class="layersButton" id="layersB">${icons.layers} Layers <span aria-hidden="true">⌄</span></button></div>
      <button class="mapLocate" id="locateMe" aria-label="Your location">${icons.locate}</button>`;
    bindNav(el);
    bindSearch();
    bindAccountBadge(el);
    $("#layersB").onclick = showLayers;
    $("#findMiss").onclick = findMissing;
    $("#q").placeholder = "Search a place or address";
    const bases = () => el.querySelectorAll("[data-base]").forEach(b => { const on = b.dataset.base === currentBase(); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    el.querySelectorAll("[data-base]").forEach(b => { b.onclick = () => { setBaseLayer(b.dataset.base); bases(); }; });
    bases();
    $("#locateMe").onclick = () => {
      if (state.me) return centerOn([state.me.lat, state.me.lng], 18);
      if (!navigator.geolocation) return toast("Location is unavailable in this browser.");
      navigator.geolocation.getCurrentPosition(p => centerOn([p.coords.latitude, p.coords.longitude], 18), () => toast("Location is off. Allow location access to centre the map."), { enableHighAccuracy: true, timeout: 10000 });
    };
    const syncBases = () => bases();
    liveMap.on("baselayerchange", syncBases);
    stop = () => liveMap.off("baselayerchange", syncBases);
  },
  close() {
    stop?.(); stop = null;
  }
};
