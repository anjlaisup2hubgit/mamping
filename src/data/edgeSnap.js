// "Snap to roof edges": slides each wall of an outline onto the roof edge in the satellite photo.
// Like reading a blurry number plate, it uses what we know about the shape: a wall is a straight line, so the
// colour change across it is measured all along the wall and averaged. That finds the edge more precisely
// than a single blurry pixel could. Maths is done in metres.
import { metreFrame, mid } from "./geo.js";

const SEARCH = 1.2;  // metres a wall may move in or out
const STEP = 0.05;   // metres between tried positions
const GAP = 0.35;    // metres from the line to each side where the colours are compared
const ALONG = 0.25;  // metres between measuring points along a wall
const BETTER = 1.25; // the new spot must show a clearly stronger edge than where the wall is now
const FAINT = 15;   // average colour change too small to count as an edge at all (out of about 440)

const colourGap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// How strong the edge is along a line `d` metres out from the wall: the average colour change across it.
function edgeStrength(points, [nx, ny], d, colourAt) {
  let total = 0;
  for (const [x, y] of points) total += colourGap(colourAt(x + (d - GAP) * nx, y + (d - GAP) * ny), colourAt(x + (d + GAP) * nx, y + (d + GAP) * ny));
  return total / points.length;
}

// Best distance to move one wall, or 0 if no clearly stronger edge is nearby.
function bestShift(a, b, colourAt) {
  const wx = b[0] - a[0], wy = b[1] - a[1], len = Math.hypot(wx, wy);
  if (len < 1.5) return 0; // too short to measure well
  const normal = [-wy / len, wx / len], points = [];
  for (let s = 0.15 * len; s <= 0.85 * len; s += ALONG) points.push([a[0] + wx * s / len, a[1] + wy * s / len]); // skip the corners, where other walls meet
  const tries = [];
  for (let d = -SEARCH; d <= SEARCH + 1e-9; d += STEP) tries.push([d, edgeStrength(points, normal, d, colourAt)]);
  const k = tries.reduce((best, t, i) => (t[1] > tries[best][1] ? i : best), 0);
  if (tries[k][1] < FAINT || tries[k][1] < BETTER * edgeStrength(points, normal, 0, colourAt)) return 0;
  if (k === 0 || k === tries.length - 1) return tries[k][0]; // at the end of the search: no curve to fit
  const [l, m, r] = [tries[k - 1][1], tries[k][1], tries[k + 1][1]], bend = l - 2 * m + r;
  return tries[k][0] + (bend < 0 ? 0.5 * STEP * (l - r) / bend : 0); // fit a curve through the top 3 to land between steps
}

// Where two walls (each a point and a direction) cross; null if they run alongside each other.
function cross([p, u], [q, v]) {
  const det = u[0] * v[1] - u[1] * v[0];
  if (Math.abs(det) < 0.1) return null;
  const t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / det;
  return [p[0] + t * u[0], p[1] + t * u[1]];
}

// coords = [[lat, lng], ...]; colourAt(lat, lng) = [r, g, b] from the photo.
// Returns { coords, moved } where moved = how many walls found a better edge.
export function snapToEdges(coords, colourAt) {
  const f = metreFrame(mid(coords)), P = coords.map(f.to), n = P.length;
  const at = (x, y) => colourAt(...f.back([x, y]));
  const shifts = P.map((p, i) => bestShift(p, P[(i + 1) % n], at));
  const walls = P.map((p, i) => {
    const q = P[(i + 1) % n], len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, u = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
    return [[p[0] - u[1] * shifts[i], p[1] + u[0] * shifts[i]], u];
  });
  const out = P.map((p, i) => {
    const before = walls[(i - 1 + n) % n], after = walls[i];
    return cross(before, after) || [p[0] - after[1][1] * shifts[i], p[1] + after[1][0] * shifts[i]]; // a straight-through corner just moves with its wall
  });
  return { coords: out.map(f.back), moved: shifts.filter(s => s !== 0).length };
}
