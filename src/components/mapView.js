// The main map and the blue-dot style pin for the user.
import { HAI_PHONG, TILE_URL, SATELLITE_TILE_URL, STREET_STYLE_URL } from "../data/config.js";
import { state } from "../data/state.js";
import { onMeMove, watchMe } from "../data/location.js";
import { toast } from "./toast.js";

export let map = null;
export const meIcon = L.divIcon({ className: "", html: '<div class="pinicon"></div>', iconSize: [26, 26], iconAnchor: [8, 26] });

let meMarker = null, followed = false, base = null, baseName = "street", pitch = 0;

const BASES = {
  street: { url: TILE_URL, credit: "© OpenFreeMap © OpenMapTiles Data from OpenStreetMap" },
  satellite: { url: SATELLITE_TILE_URL, credit: "Imagery © Esri" }
};

export const currentBase = () => baseName;
export function setBaseLayer(name) {
  if (base) map.removeLayer(base);
  baseName = name;
  // Street uses the free vector map (shows buildings); fall back to plain tiles if it did not load.
  const vector = name === "street" && L.maplibreGL;
  base = (vector ? L.maplibreGL({ style: STREET_STYLE_URL, attribution: BASES.street.credit }) : L.tileLayer(BASES[name].url, { maxZoom: 19, attribution: BASES[name].credit })).addTo(map);
  if (base.bringToBack) base.bringToBack();
  applyTilt();
  map.getContainer().classList.toggle("street", name === "street");
}

// Tilt only works on the street vector map; it shows the style's 3D buildings.
// Flat building outlines can't tilt with the map, so they are hidden while tilted.
function applyTilt() {
  if (base && base.getMaplibreMap) base.getMaplibreMap().setPitch(pitch);
  map.getContainer().classList.toggle("tilted", pitch > 0 && !!(base && base.getMaplibreMap));
}
function setPitch(p) { pitch = Math.max(0, Math.min(85, p)); applyTilt(); }

// Right-click drag (mouse) or two-finger vertical drag (touch) tilts the view.
function startTiltGestures(el) {
  let startY = null, startPitch = 0;
  el.addEventListener("contextmenu", e => e.preventDefault());
  el.addEventListener("mousedown", e => { if (e.button === 2) { startY = e.clientY; startPitch = pitch; } });
  window.addEventListener("mousemove", e => { if (startY !== null) setPitch(startPitch + (startY - e.clientY) * 0.3); });
  window.addEventListener("mouseup", () => { startY = null; });
  const avgY = t => (t[0].clientY + t[1].clientY) / 2;
  el.addEventListener("touchstart", e => { if (e.touches.length === 2) { startY = avgY(e.touches); startPitch = pitch; } });
  el.addEventListener("touchmove", e => { if (e.touches.length === 2 && startY !== null) setPitch(startPitch + (startY - avgY(e.touches)) * 0.3); });
  el.addEventListener("touchend", () => { startY = null; });
}

export function startMap() {
  map = L.map("map", { zoomControl: false }).setView(HAI_PHONG, 17);
  setBaseLayer("street");
  startTiltGestures(map.getContainer());
  map.on("moveend", applyTilt); // the vector layer can reset pitch when the map moves
  onMeMove(me => {
    if (!meMarker) meMarker = L.marker([me.lat, me.lng], { icon: meIcon, zIndexOffset: 1000 }).addTo(map);
    else meMarker.setLatLng([me.lat, me.lng]);
    if (!followed) { followed = true; map.setView([me.lat, me.lng], 17); }
  });
  watchMe(() => toast("Location is off. Showing Hai Phong."));
}

export const centerOn = (latlng, zoom = 18) => map.setView(latlng, zoom);
// Slides the map so a point sits in the top part of the screen, above a panel.
export const liftIntoView = latlng => map.panBy([0, map.latLngToContainerPoint(latlng).y - innerHeight * 0.2]);
export const goHaiPhong = () => map.setView(HAI_PHONG, 17);
export const goMe = () => (state.me ? centerOn([state.me.lat, state.me.lng]) : toast("Waiting for your location. Allow location access if asked."));
export const viewCenter = () => (state.me ? { lat: state.me.lat, lng: state.me.lng } : map.getCenter());
