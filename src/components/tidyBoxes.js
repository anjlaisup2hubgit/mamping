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

let last = []; // [{b, coords}]: what the last tidy changed, so it can be undone

const setCoords = (b, coords) => { b.coords = coords; b.center = mid(coords); if (b.shape) b.shape.setLatLngs(coords); };

// quiet = no toast and no undo (used for the automatic tidy of new boxes).
export async function tidy(list, quiet = false) {
  const houses = [...state.buildings.values()].map(b => b.coords), before = [];
  for (const b of list) {
    await loadRoads(...b.center); // roads load once per area, so a row is fast
    const squared = squareAny(b.coords);
    before.push({ b, coords: b.coords });
    setCoords(b, lineUp(squared, wallAngle(mid(squared), roadsNow(), houses, roadReach())));
  }
  restyle(); saveBoxes();
  if (quiet) return;
  last = before;
  toast(`${list.length} building${list.length > 1 ? "s" : ""} squared and lined up.`);
}

export const canUndoTidy = () => last.length > 0;

export function undoTidy() {
  if (!last.length) return false;
  last.forEach(({ b, coords }) => setCoords(b, coords));
  last = [];
  restyle(); saveBoxes();
  return true;
}
