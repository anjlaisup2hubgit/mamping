// "Tidy": makes boxes into true rectangles and turns each one to line up with its nearest road (or the house next door).
// Works on one box or a whole row at once; one undo brings the whole row back.
import { state } from "../data/state.js";
import { mid } from "../data/geo.js";
import { squareAny } from "../data/rightAngles.js";
import { lineUp } from "../data/shapeMoves.js";
import { wallAngle } from "../data/rectangle.js";
import { loadRoads, roadsNow, roadReach } from "../data/roads.js";
import { restyle, saveBoxes } from "./missingLayer.js";
import { toast } from "./toast.js";
import { validatePolygon } from "../data/geometry.js";

let last = []; // [{b, coords}]: what the last tidy changed, so it can be undone

const setCoords = (b, coords) => { b.coords = coords; b.center = mid(coords); if (b.shape) b.shape.setLatLngs(coords); };

// Tidy runs only when requested. Preparing road data must never overwrite a newer manual edit.
export async function tidy(list) {
  const houses = [...state.buildings.values()].map(b => b.coords), changes = [];
  const selected = list.map(b => ({ b, coords: b.coords.map(p => [...p]), signature: JSON.stringify(b.coords) }));
  for (const { b, coords, signature } of selected) {
    await loadRoads(...b.center); // roads load once per area, so a row is fast
    if (JSON.stringify(b.coords) !== signature) continue;
    const squared = squareAny(coords);
    const road = wallAngle(mid(squared), roadsNow(), houses, roadReach());
    const proposal = lineUp(squared, road);
    if (!validatePolygon(proposal)) changes.push({ b, coords, proposal, signature, reviewed: b.reviewed });
  }
  if (!changes.length) return toast("No unchanged, usable outlines to tidy.");
  if (!confirm(`Square and line up ${changes.length} outline(s)? This is undoable. Check their fit against the original picture afterward.`)) return;
  last = changes.filter(c => JSON.stringify(c.b.coords) === c.signature);
  for (const { b, coords, proposal } of last) {
    b.shapePast = [...(b.shapePast || []), coords].slice(-50); b.shapeFuture = []; b.reviewed = false;
    setCoords(b, proposal);
  }
  restyle(); saveBoxes();
  toast(`${last.length} outline(s) tidied. Review them before adding.`);
}

export const canUndoTidy = () => last.length > 0;

export function undoTidy() {
  if (!last.length) return false;
  last.forEach(({ b, coords, proposal, reviewed }) => {
    if (JSON.stringify(b.coords) !== JSON.stringify(proposal)) return;
    b.shapeFuture = [...(b.shapeFuture || []), b.coords]; b.shapePast?.pop(); b.reviewed = reviewed;
    setCoords(b, coords);
  });
  last = [];
  restyle(); saveBoxes();
  return true;
}
