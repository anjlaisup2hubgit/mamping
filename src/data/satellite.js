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
