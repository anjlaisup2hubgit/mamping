// Roads near a point, from our server, which reads them out of the street map's tiles.
// If our server cannot be reached, OpenStreetMap is asked instead.
import { fetchRoadsNear } from "./overpass.js";

const Z = 14;
const tileOf = (lat, lng) => {
  const n = 2 ** Z, r = lat * Math.PI / 180;
  return [Math.floor((lng + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)];
};

// Roads within about r metres of a point, each as a list of [lat, lng].
export async function roadsNear(lat, lng, r) {
  const dLat = r / 111320, dLng = dLat / Math.cos(lat * Math.PI / 180); // metres to degrees
  const s = lat - dLat, n = lat + dLat, w = lng - dLng, e = lng + dLng;
  try {
    const [x0, y0] = tileOf(n, w), [x1, y1] = tileOf(s, e), asks = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      asks.push(fetch(`/api/roads?x=${x}&y=${y}`).then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status)))));
    }
    // A square is about 2 km wide, so keep only the roads that come near the point.
    const near = line => Math.min(...line.map(p => p[0])) <= n && Math.max(...line.map(p => p[0])) >= s
      && Math.min(...line.map(p => p[1])) <= e && Math.max(...line.map(p => p[1])) >= w; // the road's box overlaps the area
    return (await Promise.all(asks)).flat().filter(near);
  } catch (err) { return fetchRoadsNear(lat, lng, r); }
}
