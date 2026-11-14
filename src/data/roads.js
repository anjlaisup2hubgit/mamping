// Roads near where the user is working, loaded once per area so outlines can line up with them.
import { fetchRoadsNear } from "./overpass.js";
import { dist, metreFrame } from "./geo.js";

let roads = [], at = null, loading = Promise.resolve();

let chosen = null; // one street the user tapped; new outlines line up with it instead of the nearest road

// The roads outlines should line up with, and how far away (metres) a road may be and still count.
export const roadsNow = () => (chosen ? [chosen] : roads);
export const roadReach = () => (chosen ? Infinity : 60);
export const hasStreet = () => !!chosen;
export const clearStreet = () => { chosen = null; };

// Chooses the loaded road closest to a point. Returns it (list of [lat, lng]) or null if none are loaded.
export function chooseStreetNear(lat, lng) {
  const f = metreFrame([lat, lng]);
  let best = Infinity;
  roads.forEach(line => line.slice(1).forEach((q, i) => {
    const [ax, ay] = f.to(line[i]), [bx, by] = f.to(q), dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    if (!len2) return;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) { best = d; chosen = line; }
  }));
  return best < 40 ? chosen : (chosen = null); // a tap far from every street chooses nothing
}

// Starts loading roads around a point, unless they are already loaded nearby. The promise settles when done (or failed).
export function loadRoads(lat, lng) {
  if (at && dist(lat, lng, at[0], at[1]) < 150) return loading;
  at = [lat, lng];
  loading = fetchRoadsNear(lat, lng, 300).then(r => { roads = r; }).catch(() => { at = null; }); // busy server: try again next time
  return loading;
}
