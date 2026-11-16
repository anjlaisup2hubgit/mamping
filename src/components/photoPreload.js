// Downloads the satellite photos around a spot ahead of time, so jumping there later shows them at once.
import { SATELLITE_TILE_URL } from "../data/config.js";
import { map } from "./mapView.js";

const ZOOM = 19; // the closest level the satellite pictures come in
const asked = new Set();

export function preloadPhotos(latlng) {
  const size = map.getSize(), half = size.divideBy(2);
  const middle = map.project(latlng, ZOOM);
  const from = middle.subtract(half).divideBy(256).floor(), to = middle.add(half).divideBy(256).floor();
  for (let x = from.x; x <= to.x; x++) for (let y = from.y; y <= to.y; y++) {
    const url = L.Util.template(SATELLITE_TILE_URL, { z: ZOOM, x, y });
    if (asked.has(url)) continue;
    asked.add(url);
    new Image().src = url; // the browser keeps it, so the map gets it instantly later
  }
}
