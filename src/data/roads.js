// Roads near where the user is working, loaded once per area so outlines can line up with them.
import { fetchRoadsNear } from "./overpass.js";
import { dist } from "./geo.js";

let roads = [], at = null, loading = Promise.resolve();

export const roadsNow = () => roads;

// Starts loading roads around a point, unless they are already loaded nearby. The promise settles when done (or failed).
export function loadRoads(lat, lng) {
  if (at && dist(lat, lng, at[0], at[1]) < 150) return loading;
  at = [lat, lng];
  loading = fetchRoadsNear(lat, lng, 300).then(r => { roads = r; }).catch(() => { at = null; }); // busy server: try again next time
  return loading;
}
