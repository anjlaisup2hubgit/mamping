// Turns the pictures from a drive into a list of buildings, asking the AI about 3 pictures (about 45 m of road) at a time.
import { state } from "./state.js";
import { candidatesNear } from "./buildings.js";
import { analyzeVideo } from "./api.js";

export const MIN_CONFIDENCE = 0.4;

// Splits the pictures into groups of 3 in driving order.
export function groupPics(pics, size = 3) {
  const out = [];
  for (let i = 0; i < pics.length; i += size) out.push(pics.slice(i, i + size));
  return out;
}

export const middleOf = group => group[Math.floor(group.length / 2)];

// Asks the AI which nearby building one group shows. Returns null if it is not sure.
export async function matchGroup(group) {
  const p = middleOf(group);
  const ai = await analyzeVideo({ frames: group.map(g => g.img), candidates: candidatesNear(p.lat, p.lng), lat: p.lat, lng: p.lng });
  const b = ai.buildingId && state.buildings.get(ai.buildingId);
  if (!b || (ai.confidence || 0) < MIN_CONFIDENCE) return null;
  return { b, ai, lat: p.lat, lng: p.lng };
}

// Keeps one result per building: the one the AI was most sure about.
export function addResult(found, r) {
  const old = found.get(r.b.id);
  if (!old || r.ai.confidence > old.ai.confidence) found.set(r.b.id, r);
}
