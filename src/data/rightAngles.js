// Makes an outline's corners true right angles. Worked out in metres.
import { metreFrame, rectOf } from "./geo.js";

const QUARTER = Math.PI / 2;

// 4 corners: a neat rectangle. More corners (an L shape, say): every wall is kept, but each one is turned to run
// along the longest wall's direction or square to it, and each corner is where two neighbouring walls meet.
export function squareAny(coords) {
  const f = metreFrame(coords[0]), P = coords.map(f.to), n = P.length;
  if (n <= 4) return rectOf(P).map(f.back);
  const walls = P.map((p, i) => { const q = P[(i + 1) % n]; return { len: Math.hypot(q[0] - p[0], q[1] - p[1]), ang: Math.atan2(q[1] - p[1], q[0] - p[0]) }; });
  const main = walls.reduce((a, w) => (w.len > a.len ? w : a)).ang;
  const lines = walls.map((w, i) => { // each wall, straightened, through its own middle
    const q = P[(i + 1) % n], d = main + QUARTER * Math.round((w.ang - main) / QUARTER);
    return { x: (P[i][0] + q[0]) / 2, y: (P[i][1] + q[1]) / 2, c: Math.cos(d), s: Math.sin(d) };
  });
  return P.map((p, i) => {
    const A = lines[(i - 1 + n) % n], B = lines[i], det = A.c * B.s - A.s * B.c;
    if (Math.abs(det) < 1e-6) return p; // two walls in a row now run the same way: leave this corner be
    const t = ((B.x - A.x) * B.s - (B.y - A.y) * B.c) / det;
    return [A.x + t * A.c, A.y + t * A.s];
  }).map(f.back);
}

// A 3-corner outline (a triangle) made into a rectangle whose walls run like wall `i` (the wall the user says is right).
export function squareFromWall(coords, i) {
  const f = metreFrame(coords[0]), P = coords.map(f.to), q = P[(i + 1) % P.length];
  return rectOf(P, Math.atan2(q[1] - P[i][1], q[0] - P[i][0])).map(f.back);
}

// For every corner: is it a right angle (within 3°)? Used to colour the corner dots.
export function rightCorners(coords) {
  const f = metreFrame(coords[0]), P = coords.map(f.to), n = P.length;
  return P.map((p, i) => {
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
    const ux = a[0] - p[0], uy = a[1] - p[1], vx = b[0] - p[0], vy = b[1] - p[1];
    const cos = (ux * vx + uy * vy) / ((Math.hypot(ux, uy) * Math.hypot(vx, vy)) || 1);
    return Math.abs(cos) < Math.sin(3 * Math.PI / 180);
  });
}
