// The main map and the blue-dot style pin for the user.
import { HAI_PHONG, TILE_URL, SATELLITE_TILE_URL, STREET_STYLE_URL } from "../data/config.js";
import { state } from "../data/state.js";
import { onMeMove, watchMe } from "../data/location.js";
import { toast } from "./toast.js";
import { syncSharpPhotos } from "./sharpPhotos.js";

export let map = null;
export const meIcon = L.divIcon({ className: "", html: '<div class="pinicon"></div>', iconSize: [26, 26], iconAnchor: [8, 26] });

// Pictures only go to level 19; past that they are stretched bigger, so you can zoom in closer on a roof.
export const MAX_ZOOM = 22;
let meMarker = null, followed = false, base = null, baseName = "street", pitch = 0, bearing = 0;

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
  base = (vector ? L.maplibreGL({ style: STREET_STYLE_URL, attribution: BASES.street.credit }) : L.tileLayer(BASES[name].url, { maxNativeZoom: 19, maxZoom: MAX_ZOOM, keepBuffer: 6, attribution: BASES[name].credit })).addTo(map);
  if (base.bringToBack) base.bringToBack();
  applyTilt();
  map.getContainer().classList.toggle("street", name === "street");
  syncSharpPhotos();
  map.fire("baselayerchange", { name });
}

// Tilt only works on the street vector map; it shows the style's 3D buildings.
// Flat building outlines can't tilt with the map, so they are hidden while tilted.
function applyTilt() {
  if (base && base.getMaplibreMap) {
    base.getMaplibreMap().setPitch(pitch);
    base.getMaplibreMap().setBearing(bearing);
  }
  const tilted = (pitch > 0 || bearing !== 0) && !!(base && base.getMaplibreMap);
  map.getContainer().classList.toggle("tilted", tilted);
  // While tilted, our own drag (below) moves the map, because Leaflet's flat drag fights the turned 3D view.
  if (tilted) map.dragging.disable(); else map.dragging.enable();
}
function setPitch(p) { pitch = Math.max(0, Math.min(85, p)); applyTilt(); }
function setBearing(b) { bearing = ((b % 360) + 360) % 360; applyTilt(); }

// Holding an arrow key walks the camera smoothly around the buildings: left/right spin 360°, up/down tilt.
function startSpinKeys() {
  const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [1, 0], ArrowDown: [-1, 0] };
  const held = new Set();
  let last = 0;
  const step = now => {
    if (!held.size) return;
    const secs = Math.min(0.05, (now - last) / 1000); last = now;
    let dp = 0, db = 0;
    held.forEach(k => { dp += moves[k][0]; db += moves[k][1]; });
    pitch = Math.max(0, Math.min(85, pitch + dp * 45 * secs)); // 45° a second
    setBearing(bearing + db * 90 * secs); // 90° a second: a full circle in 4 seconds
    requestAnimationFrame(step);
  };
  window.addEventListener("keydown", e => {
    if (!moves[e.key] || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    e.preventDefault();
    e.stopPropagation(); // stop the map from sliding sideways too
    if (!held.size) { last = performance.now(); requestAnimationFrame(step); }
    held.add(e.key);
  }, true);
  window.addEventListener("keyup", e => held.delete(e.key));
  window.addEventListener("blur", () => held.clear());
}

// Left-drag (or one finger) while tilted: the ground follows the pointer, in whatever direction the view faces.
function startTiltedDrag(el) {
  let last = null;
  el.addEventListener("pointerdown", e => {
    if (!e.isPrimary) { last = null; return; } // a second finger means pinch or tilt, not drag
    if (e.button !== 0 || map.dragging.enabled()) return;
    if (e.target.closest(".leaflet-marker-pane, .leaflet-control-container, .leaflet-popup-pane")) return;
    last = [e.clientX, e.clientY];
  });
  window.addEventListener("pointermove", e => {
    if (!last || !e.isPrimary) return;
    const gl = base.getMaplibreMap(), c = gl.project(gl.getCenter());
    const centre = gl.unproject([c.x - (e.clientX - last[0]), c.y - (e.clientY - last[1])]);
    last = [e.clientX, e.clientY];
    map.setView([centre.lat, centre.lng], map.getZoom(), { animate: false });
    base._update(); // move the 3D map now instead of waiting for its slow catch-up
  });
  window.addEventListener("pointerup", () => { last = null; });
  window.addEventListener("pointercancel", () => { last = null; });
}

// Right-click drag (mouse): up/down tilts, left/right turns. Two-finger vertical drag (touch) tilts.
function startTiltGestures(el) {
  let startY = null, startX = 0, startPitch = 0, startBearing = 0;
  el.addEventListener("contextmenu", e => e.preventDefault());
  el.addEventListener("mousedown", e => { if (e.button === 2) { startY = e.clientY; startX = e.clientX; startPitch = pitch; startBearing = bearing; } });
  window.addEventListener("mousemove", e => {
    if (startY === null) return;
    pitch = Math.max(0, Math.min(85, startPitch + (startY - e.clientY) * 0.3));
    setBearing(startBearing + (startX - e.clientX) * 0.3);
  });
  window.addEventListener("mouseup", () => { startY = null; });
  const avgY = t => (t[0].clientY + t[1].clientY) / 2;
  el.addEventListener("touchstart", e => { if (e.touches.length === 2) { startY = avgY(e.touches); startPitch = pitch; } });
  el.addEventListener("touchmove", e => { if (e.touches.length === 2 && startY !== null) setPitch(startPitch + (startY - avgY(e.touches)) * 0.3); });
  el.addEventListener("touchend", () => { startY = null; });
}

// Round "2D" button, shown only while tilted or turned (see styles.css): one tap puts the map flat with north up.
function addFlatButton() {
  const btn = L.DomUtil.create("button", "round", map.getContainer());
  btn.id = "flatBtn"; btn.textContent = "2D"; btn.setAttribute("aria-label", "Flat view"); btn.dataset.tip = "Flat view";
  L.DomEvent.disableClickPropagation(btn);
  btn.addEventListener("click", () => { pitch = 0; bearing = 0; applyTilt(); });
}

export function startMap() {
  map = L.map("map", { zoomControl: false, maxZoom: MAX_ZOOM, fadeAnimation: false }).setView(HAI_PHONG, 17); // photos appear at once instead of fading in from blank
  new ResizeObserver(() => map.invalidateSize({ pan: false })).observe(map.getContainer());
  setBaseLayer("street");
  addFlatButton();
  startTiltGestures(map.getContainer());
  startSpinKeys();
  startTiltedDrag(map.getContainer());
  map.on("moveend", applyTilt); // the vector layer can reset pitch when the map moves
  onMeMove(me => {
    if (!meMarker) meMarker = L.marker([me.lat, me.lng], { icon: meIcon, zIndexOffset: 1000 }).addTo(map);
    else meMarker.setLatLng([me.lat, me.lng]);
    if (!followed) { followed = true; map.setView([me.lat, me.lng], 17); }
  });
  watchMe(() => toast("Location is off. Showing Hai Phong."));
}

export const centerOn = (latlng, zoom = 18, options) => {
  followed = true; // a chosen place must not be replaced by the first delayed GPS update
  return map.setView(latlng, zoom, options);
};
// Slides the map so a point sits in the middle of the screen.
export const liftIntoView = latlng => map.panTo(latlng);
// Moving to another building glides there instead of jumping, which is easier on the eyes.
let gliding = false;
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function moveTo(centre, zoom, glide) {
  if ((glide || gliding) && !still()) { // a refit mid-glide just steers the glide to the new spot
    gliding = true;
    map.once("moveend", () => { gliding = false; });
    return map.flyTo(centre, zoom, { duration: 0.5 });
  }
  map.stop();
  map.setView(centre, zoom, { animate: false });
}
export const glideTo = (latlng, zoom) => moveTo(latlng, zoom, true);
// Put the roof and its handles in the part of the map left clear by the inspector and keyboard.
export function fitEditingView(coords, glide = false) {
  if (!map || !coords?.length) return;
  const rect = map.getContainer().getBoundingClientRect(), view = window.visualViewport;
  let left = Math.max(rect.left, view?.offsetLeft || 0) + 16;
  let right = Math.min(rect.right, (view?.offsetLeft || 0) + (view?.width || innerWidth)) - 16;
  let top = Math.max(rect.top, view?.offsetTop || 0) + 20;
  let bottom = Math.min(rect.bottom, (view?.offsetTop || 0) + (view?.height || innerHeight)) - 16;
  const sheet = document.querySelector("#bsheet.editorSheet.on")?.getBoundingClientRect();
  if (sheet) {
    bottom = Math.min(bottom, sheet.top - 12);
    const rail = document.querySelector(".editRail")?.getBoundingClientRect();
    if (rail?.width) right = Math.min(right, rail.left - 12); // keep the roof clear of the tool rail
  }
  const progress = document.querySelector(".scanProgress")?.getBoundingClientRect();
  if (progress && progress.height) top = Math.max(top, progress.bottom + 12);
  if (right - left < 100 || bottom - top < 100) return;
  const bounds = L.latLngBounds(coords), size = map.getSize();
  const availableWidth = right - left, availableHeight = bottom - top;
  const padding = L.point(Math.max(0, size.x - availableWidth + Math.min(112, availableWidth - 40)),
    Math.max(0, size.y - availableHeight + Math.min(128, availableHeight - 40)));
  const snap = map.options.zoomSnap;
  map.options.zoomSnap = 0; // Whole zoom levels can make short-screen handles overlap unnecessarily.
  const zoom = Math.min(21, map.getBoundsZoom(bounds, false, padding)); // close enough to see edges; any closer and the photo is too blurry to edit
  const roof = map.project(bounds.getCenter(), zoom);
  const desired = L.point((left + right) / 2 - rect.left, (top + bottom) / 2 - rect.top + 6);
  const centre = map.unproject(roof.subtract(desired.subtract(size.divideBy(2))), zoom);
  moveTo(centre, zoom, glide);
  map.options.zoomSnap = snap;
}
export const goHaiPhong = () => map.setView(HAI_PHONG, 17);
export const viewCenter = () => (state.me ? { lat: state.me.lat, lng: state.me.lng } : map.getCenter());
