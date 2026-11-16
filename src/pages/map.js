// Explore: one row of tools above the map, stacked at the top on phones.
import { $ } from "../components/dom.js";
import { findMissing } from "../components/missingLayer.js";
import { bottomNav, bindNav } from "../components/bottomNav.js";
import { searchBar, bindSearch } from "../components/searchBar.js";
import { baseToggle, bindBaseToggle } from "../components/baseToggle.js";
import { accountBadge, bindAccountBadge } from "../components/accountBadge.js";
import { icons } from "../components/icons.js";
import { centerOn } from "../components/mapView.js";
import { state } from "../data/state.js";
import { toast } from "../components/toast.js";

let stop = null;

export const map = {
  full: false,
  open(el) {
    el.innerHTML = `<header class="masthead" aria-label="Map workspace">
      <div class="profileSlot">${accountBadge() || `<button class="profileButton" data-to="settings" aria-label="Your account">${icons.person}</button>`}</div>
      <div class="searchSlot">${searchBar()}</div></header>
      <div class="mapToolbar">${baseToggle()}<button class="mapLocate" id="locateMe" aria-label="Your location" data-tip="Your location">${icons.locate}</button></div>
      <button class="findMissing" id="findMiss">${icons.scan}<span>Find missing</span></button>
      ${bottomNav()}`;
    bindNav(el);
    bindSearch();
    bindAccountBadge(el);
    $("#findMiss").onclick = findMissing;
    $("#q").placeholder = "Search a place or address";
    stop = bindBaseToggle(el);
    $("#locateMe").onclick = () => {
      if (state.me) return centerOn([state.me.lat, state.me.lng], 18);
      if (!navigator.geolocation) return toast("Location is unavailable in this browser.");
      navigator.geolocation.getCurrentPosition(p => centerOn([p.coords.latitude, p.coords.longitude], 18), () => toast("Location is off. Allow location access to centre the map."), { enableHighAccuracy: true, timeout: 10000 });
    };
  },
  close() {
    stop?.(); stop = null;
  }
};
