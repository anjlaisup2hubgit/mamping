// The main map and the blue-dot style pin for the user.
import { HAI_PHONG, TILE_URL, SATELLITE_TILE_URL, STREET_STYLE_URL } from "../data/config.js";
import { state } from "../data/state.js";
import { onMeMove, watchMe } from "../data/location.js";
import { toast } from "./toast.js";

export let map = null;
export const meIcon = L.divIcon({ className: "", html: '<div class="pinicon"></div>', iconSize: [26, 26], iconAnchor: [8, 26] });

let meMarker = null, followed = false, base = null, baseName = "street";

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
  base.bringToBack();
  map.getContainer().classList.toggle("street", name === "street");
}

export function startMap() {
  map = L.map("map", { zoomControl: false }).setView(HAI_PHONG, 17);
  setBaseLayer("street");
  onMeMove(me => {
    if (!meMarker) meMarker = L.marker([me.lat, me.lng], { icon: meIcon, zIndexOffset: 1000 }).addTo(map);
    else meMarker.setLatLng([me.lat, me.lng]);
    if (!followed) { followed = true; map.setView([me.lat, me.lng], 17); }
  });
  watchMe(() => toast("Location is off. Showing Hai Phong."));
}

export const centerOn = (latlng, zoom = 18) => map.setView(latlng, zoom);
export const goHaiPhong = () => map.setView(HAI_PHONG, 17);
export const goMe = () => (state.me ? centerOn([state.me.lat, state.me.lng]) : toast("Waiting for GPS"));
export const viewCenter = () => (state.me ? { lat: state.me.lat, lng: state.me.lng } : map.getCenter());
