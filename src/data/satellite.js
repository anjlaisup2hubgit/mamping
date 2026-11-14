// Builds one satellite picture and turns picture pixels into map points.
import { SATELLITE_URL } from "./config.js";

const Z = 19, TILE = 256;
const tileX = lng => (lng + 180) / 360 * 2 ** Z;
const tileY = lat => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** Z;
const lngOf = x => x / 2 ** Z * 360 - 180;
const latOf = y => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** Z))) * 180 / Math.PI;

const loadImage = url => new Promise((ok, no) => {
  const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = no; i.src = url;
});

// Pictures sit on a fixed grid (3x3 tiles each), so a square on the screen is always exactly one picture.
const STEP = 3, EPS = 1e-6; // EPS: a corner already on a grid line stays there
const down = v => Math.floor(v / STEP + EPS) * STEP, up = v => Math.ceil(v / STEP - EPS) * STEP;

// The picture squares that cover the bounds, nearest the middle first. Each: {centre, nw, se} as [lat, lng].
export function pictureSquares(bounds) {
  const w = tileX(bounds.getWest()), e = tileX(bounds.getEast()), n = tileY(bounds.getNorth()), s = tileY(bounds.getSouth());
  const mx = (w + e) / 2, my = (n + s) / 2, list = [];
  for (let x = down(w); x < e - EPS; x += STEP) for (let y = down(n); y < s - EPS; y += STEP) list.push([x, y]);
  const far = ([x, y]) => Math.hypot(x + 1.5 - mx, y + 1.5 - my);
  return list.sort((a, b) => far(a) - far(b))
    .map(([x, y]) => ({ centre: [latOf(y + 1.5), lngOf(x + 1.5)], nw: [latOf(y), lngOf(x)], se: [latOf(y + STEP), lngOf(x + STEP)] }));
}

export const viewCentres = (bounds, max) => pictureSquares(bounds).slice(0, max).map(p => p.centre);

// Grows a box out to the edges of whole pictures (at least one). Returns [nw, se] as [lat, lng].
export function snapToPictures(bounds) {
  const x0 = down(tileX(bounds.getWest())), y0 = down(tileY(bounds.getNorth()));
  const x1 = Math.max(up(tileX(bounds.getEast())), x0 + STEP), y1 = Math.max(up(tileY(bounds.getSouth())), y0 + STEP);
  return [[latOf(y0), lngOf(x0)], [latOf(y1), lngOf(x1)]];
}

export async function getSatelliteView(lat, lng) {
  const cx = Math.floor(tileX(lng)), cy = Math.floor(tileY(lat));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE * 3;
  const g = canvas.getContext("2d");
  const jobs = [0, 1, 2].flatMap(dx => [0, 1, 2].map(async dy => {
    g.drawImage(await loadImage(`${SATELLITE_URL}/${Z}/${cy - 1 + dy}/${cx - 1 + dx}`), dx * TILE, dy * TILE);
  }));
  await Promise.all(jobs);
  return {
    image: canvas.toDataURL("image/jpeg", 0.7).split(",")[1],
    toLatLng: (px, py) => [latOf(cy - 1 + py / TILE), lngOf(cx - 1 + px / TILE)]
  };
}
