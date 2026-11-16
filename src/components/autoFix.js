// After a scan, tidies each new outline by itself: square the corners (Q), line up with the road (A), snap to the roof edges (E).
// Each step is skipped if it would break the shape, and the result goes into the outline's undo history.
import { mid } from "../data/geo.js";
import { squareAny } from "../data/rightAngles.js";
import { lineUp } from "../data/shapeMoves.js";
import { wallAngle } from "../data/rectangle.js";
import { snapToEdges } from "../data/edgeSnap.js";
import { roofPhoto } from "../data/roofPhoto.js";
import { loadRoads, roadsNow, roadReach } from "../data/roads.js";
import { validatePolygon } from "../data/geometry.js";
import { saveBoxes } from "./missingLayer.js";

const keepIfValid = (old, next) => (next && !validatePolygon(next) ? next : old);

async function fixOne(b) {
  const start = JSON.stringify(b.coords);
  let coords = keepIfValid(b.coords, squareAny(b.coords));
  try {
    await loadRoads(...b.center);
    coords = keepIfValid(coords, lineUp(coords, wallAngle(mid(coords), roadsNow(), [], roadReach())));
  } catch (e) { /* no road data: keep the squared shape */ }
  try {
    const colourAt = await roofPhoto(mid(coords));
    coords = keepIfValid(coords, snapToEdges(coords, colourAt).coords);
  } catch (e) { /* no photo: keep the lined-up shape */ }
  if (JSON.stringify(b.coords) !== start) return; // the user edited it meanwhile, so leave their work alone
  b.shapePast = [...(b.shapePast || []), b.coords].slice(-50); b.shapeFuture = [];
  b.coords = coords; b.center = mid(coords);
  if (b.shape) b.shape.setLatLngs(coords);
}

export async function autoFix(boxes) {
  for (const b of boxes) await fixOne(b);
  if (boxes.length) saveBoxes();
}
