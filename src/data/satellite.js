// Builds one satellite picture and turns picture pixels into map points.
import { SATELLITE_URL } from "./config.js";
import { checkCancelled } from "./tasks.js";

const Z = 19, TILE = 256;
const tileX = lng => (lng + 180) / 360 * 2 ** Z;
const tileY = lat => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** Z;
const lngOf = x => x / 2 ** Z * 360 - 180;
const latOf = y => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 2 ** Z))) * 180 / Math.PI;

const loadImage = (url, signal) => new Promise((ok, no) => {
  checkCancelled(signal);
  const i = new Image();
  const finish = (error) => {
    clearTimeout(timer); signal?.removeEventListener("abort", stop); i.onload = i.onerror = null;
    if (error) { i.src = ""; no(error); } else ok(i);
  };
  const stop = () => finish(signal.reason || new DOMException("Scan cancelled.", "AbortError"));
  const timer = setTimeout(() => finish(new Error("Satellite picture timed out. Check your connection.")), 20000);
  signal?.addEventListener("abort", stop, { once: true });
  i.crossOrigin = "anonymous"; i.onload = () => finish(); i.onerror = () => finish(new Error("Could not load satellite imagery.")); i.src = url;
});

// Pictures sit on a fixed grid (3x3 tiles each), so a square on the screen is always exactly one picture.
const STEP = 3, EPS = 1e-6; // EPS: a corner already on a grid line stays there
const down = v => Math.floor(v / STEP + EPS) * STEP;

// The picture squares that cover the bounds, nearest the middle first. Each: {centre, nw, se} as [lat, lng].
export function pictureSquares(bounds) {
  const w = tileX(bounds.getWest()), e = tileX(bounds.getEast()), n = tileY(bounds.getNorth()), s = tileY(bounds.getSouth());
  const mx = (w + e) / 2, my = (n + s) / 2, list = [];
  for (let x = down(w); x < e - EPS; x += STEP) for (let y = down(n); y < s - EPS; y += STEP) list.push([x, y]);
  const far = ([x, y]) => Math.hypot(x + 1.5 - mx, y + 1.5 - my);
  return list.sort((a, b) => far(a) - far(b))
    .map(([x, y]) => ({ centre: [latOf(y + 1.5), lngOf(x + 1.5)], nw: [latOf(y), lngOf(x)], se: [latOf(y + STEP), lngOf(x + STEP)] }));
}

export async function getSatelliteView(lat, lng, { signal } = {}) {
  checkCancelled(signal);
  const cx = Math.floor(tileX(lng)), cy = Math.floor(tileY(lat));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE * 3;
  const g = canvas.getContext("2d");
  const jobs = [0, 1, 2].flatMap(dx => [0, 1, 2].map(async dy => {
    g.drawImage(await loadImage(`${SATELLITE_URL}/${Z}/${cy - 1 + dy}/${cx - 1 + dx}`, signal), dx * TILE, dy * TILE);
  }));
  await Promise.all(jobs);
  return {
    canvas, // the full-quality picture, for reading pixels
    image: canvas.toDataURL("image/jpeg", 0.7).split(",")[1],
    toLatLng: (px, py) => [latOf(cy - 1 + py / TILE), lngOf(cx - 1 + px / TILE)],
    toPixel: (lat, lng) => [(tileX(lng) - (cx - 1)) * TILE, (tileY(lat) - (cy - 1)) * TILE]
  };
}
