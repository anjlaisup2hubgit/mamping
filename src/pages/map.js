// Explore: the existing interactive map with a contribution rail and phone bottom panel.
import { $ } from "../components/dom.js";
import { findMissing } from "../components/missingLayer.js";
import { bottomNav, bindNav } from "../components/bottomNav.js";
import { searchBar, bindSearch } from "../components/searchBar.js";
import { showLayers } from "../components/layersSheet.js";
import { accountBadge, bindAccountBadge } from "../components/accountBadge.js";
import { go } from "../components/router.js";
import { icons } from "../components/icons.js";
import { neighbourhoodArt } from "../components/neighbourhoodArt.js";
import { map as liveMap, setBaseLayer, currentBase, centerOn } from "../components/mapView.js";
import { state } from "../data/state.js";
import { toast } from "../components/toast.js";
import { buildingLoadState } from "../components/buildingLayer.js";

let stop = null;

function updateCounts() {
  const count = $("#buildingCount"), needed = $("#needsCount"), status = $("#buildingStatus");
  if (!count) return;
  const visible = [...state.buildings.values()].filter(b => liveMap.getBounds().intersects(L.latLngBounds(b.coords)));
  const ready = buildingLoadState() === "loaded" || visible.length > 0;
  count.textContent = ready ? visible.length.toLocaleString() : "—";
  needed.textContent = ready ? visible.filter(b => !b.ht && !b.levels).length.toLocaleString() : "—";
  status.textContent = liveMap.getZoom() < 16 ? "Zoom in to load building details." : buildingLoadState() === "failed" ? "Buildings unavailable. Move the map to retry." : buildingLoadState() === "loading" ? "Loading buildings in this area…" : "OpenStreetMap buildings in the current view.";
}

export const map = {
  full: false,
  open(el) {
    el.innerHTML = `<header class="masthead"><button class="brand" data-to="map" aria-label="Mamping explore">${icons.building}<span>mamping</span></button>
      <nav aria-label="Desktop"><button class="active" data-to="map">Explore</button><button data-to="edits">My contributions</button><button data-to="help">How it works</button></nav>
      <button class="workspaceLink" id="settingsB" aria-label="Your workspace">${icons.person}<span>Your workspace</span></button>${accountBadge()}</header>
      <aside class="contributionPanel" aria-label="Contribute to your neighbourhood">
        <button class="panelHandle" id="panelToggle" aria-expanded="true" aria-controls="contributionBody" aria-label="Collapse contribution panel"><span></span></button>
        <div class="contributionBody" id="contributionBody"><span class="eyebrow phoneIntro">Your neighbourhood</span><h1><span class="desktopIntro">A better map.<br>Built by you.</span><span class="phoneIntro">Make your map matter.</span></h1>
        <p class="introText">Bring your neighbourhood into focus. One building at a time.</p>
        <div class="searchSlot">${searchBar()}</div>
        <div class="areaLabel">${icons.locate}<span>Current map area</span></div>
        <div class="buildingStats" aria-live="polite"><div><span>Buildings in view</span><strong id="buildingCount">—</strong></div><div><span>Need details</span><strong id="needsCount">—</strong></div></div>
        <p class="mid countStatus" id="buildingStatus">Loading buildings in this area…</p>
        <div class="contributionActions"><button class="big primary" data-to="camera" id="navCam">${icons.camera} Capture a building</button><button class="big ghost" id="findMiss">${icons.scan} Find missing buildings</button></div>
        <div class="impact">${neighbourhoodArt()}<h2>Small details.<br><em>Real impact.</em></h2></div></div></aside>
      <div class="mapToolbar"><div class="baseToggle" role="group" aria-label="Base map"><button data-base="street">Street</button><button data-base="satellite">Satellite</button></div><button class="layersButton" id="layersB">${icons.layers} Layers <span aria-hidden="true">⌄</span></button></div>
      <div class="mapControls" role="group" aria-label="Map controls"><div><button id="zoomIn" aria-label="Zoom in">+</button><button id="zoomOut" aria-label="Zoom out">−</button></div><button id="locateMe" aria-label="Your location">${icons.locate}</button></div>
      <div class="mapLegend"><span><i></i>Has height / floors</span><span><i></i>Needs details</span></div>${bottomNav()}`;
    bindNav(el);
    bindSearch();
    bindAccountBadge(el);
    $("#layersB").onclick = showLayers;
    $("#findMiss").onclick = findMissing;
    $("#settingsB").onclick = () => go("settings");
    $("#q").placeholder = "Search a place or address";
    const panel = el.querySelector(".contributionPanel"), toggle = $("#panelToggle");
    toggle.onclick = () => {
      const collapsed = panel.classList.toggle("collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} contribution panel`);
    };
    const bases = () => el.querySelectorAll("[data-base]").forEach(b => { const on = b.dataset.base === currentBase(); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    el.querySelectorAll("[data-base]").forEach(b => { b.onclick = () => { setBaseLayer(b.dataset.base); bases(); }; });
    bases();
    $("#zoomIn").onclick = () => liveMap.zoomIn();
    $("#zoomOut").onclick = () => liveMap.zoomOut();
    $("#locateMe").onclick = () => {
      if (state.me) return centerOn([state.me.lat, state.me.lng], 18);
      if (!navigator.geolocation) return toast("Location is unavailable in this browser.");
      navigator.geolocation.getCurrentPosition(p => centerOn([p.coords.latitude, p.coords.longitude], 18), () => toast("Location is off. Allow location access to centre the map."), { enableHighAccuracy: true, timeout: 10000 });
    };
    liveMap.on("moveend", updateCounts);
    window.addEventListener("buildingschange", updateCounts);
    const syncBases = () => bases();
    liveMap.on("baselayerchange", syncBases);
    stop = () => { liveMap.off("moveend", updateCounts); liveMap.off("baselayerchange", syncBases); window.removeEventListener("buildingschange", updateCounts); };
    updateCounts();
  },
  close() {
    stop?.(); stop = null;
  }
};
