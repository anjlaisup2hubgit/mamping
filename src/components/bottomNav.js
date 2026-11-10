// Bottom bar: Home, big camera button, Map.
import { go } from "./router.js";
import { icons } from "./icons.js";

export const bottomNav = active => `<nav class="nav" aria-label="Main">
  <button class="navb ${active === "home" ? "on" : ""}" data-to="home" aria-label="Home" title="Home">${icons.home}</button>
  <button class="navcam" data-to="camera" id="navCam" aria-label="Take video" title="Take video">${icons.camera}</button>
  <button class="navb ${active === "map" ? "on" : ""}" data-to="map" aria-label="Map" title="Map">${icons.map}</button></nav>`;

export function bindNav(el) {
  el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
}
