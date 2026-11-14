// Questions about the buildings already loaded.
import { state } from "./state.js";
import { inside, dist } from "./geo.js";

export const heightOf = b => b.ht || (b.levels ? Math.round(b.levels * 3.2) : null);

export function nearestBuilding(lat, lng) {
  let best = null, bd = 1e9;
  state.buildings.forEach(b => {
    const d = inside([lat, lng], b.coords) ? 0 : dist(lat, lng, b.center[0], b.center[1]);
    if (d < bd) { bd = d; best = b; }
  });
  return best ? { b: best, d: bd } : null;
}

export function candidatesNear(lat, lng, count = 15) {
  return [...state.buildings.values()]
    .map(b => ({ id: b.id, name: b.name, height: heightOf(b), dist: Math.round(dist(lat, lng, b.center[0], b.center[1])) }))
    .sort((a, b) => a.dist - b.dist).slice(0, count);
}

// Does a new outline overlap a building already on the map? (a corner of one sits inside the other)
export const overlapsExisting = coords => [...state.buildings.values()].some(b =>
  coords.some(c => inside(c, b.coords)) || b.coords.some(c => inside(c, coords)));
