// Two small picture buttons on the map: street map or satellite.
import { map, currentBase, setBaseLayer } from "./mapView.js";
import { TILE_URL, SATELLITE_TILE_URL } from "../data/config.js";

// One map square at the middle of the screen, used as the button picture.
function preview(url) {
  const z = Math.min(Math.round(map.getZoom()), 17);
  const { x, y } = map.project(map.getCenter(), z).divideBy(256).floor();
  return L.Util.template(url, { z, x, y });
}

const urls = { street: TILE_URL, satellite: SATELLITE_TILE_URL };

export const baseToggle = () => `<div class="baseToggle" role="group" aria-label="Base map">${Object.keys(urls).map(name =>
  `<button data-base="${name}" aria-label="${name === "street" ? "Street map" : "Satellite"}" data-tip="${name === "street" ? "Street map" : "Satellite"}"><img alt=""></button>`).join("")}</div>`;

// Keeps the pictures and the chosen button up to date; returns a function that stops it.
export function bindBaseToggle(el) {
  const buttons = el.querySelectorAll("[data-base]");
  const draw = () => buttons.forEach(b => {
    const on = b.dataset.base === currentBase();
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    b.querySelector("img").src = preview(urls[b.dataset.base]);
  });
  buttons.forEach(b => { b.onclick = () => { setBaseLayer(b.dataset.base); draw(); }; });
  draw();
  map.on("moveend baselayerchange", draw);
  return () => map.off("moveend baselayerchange", draw);
}
