// Moves for a whole outline: slide one wall, turn it, or copy it to a new spot. Maths is done in metres.
import { metreFrame, mid, rectOf } from "./geo.js";

// Slides wall i (corner i to corner i+1) by as far as the finger moved across it, from `from` to `to`.
// Each of its two corners slides along its other wall, so every angle stays the same.
export function pushWall(c, i, from, to) {
  const n = c.length, j = (i + 1) % n, f = metreFrame(c[i]), P = c.map(f.to);
  const wx = P[j][0] - P[i][0], wy = P[j][1] - P[i][1], len = Math.hypot(wx, wy) || 1;
  const nx = -wy / len, ny = wx / len; // straight out from the wall
  const [fx, fy] = f.to(from), [tx, ty] = f.to(to), h = (tx - fx) * nx + (ty - fy) * ny;
  const slide = (k, other) => {
    const dx = P[k][0] - P[other][0], dy = P[k][1] - P[other][1], across = dx * nx + dy * ny;
    if (Math.abs(across) < 0.2 * Math.hypot(dx, dy)) return [P[k][0] + h * nx, P[k][1] + h * ny]; // that wall runs almost alongside: just push straight out
    const t = h / across;
    return [P[k][0] + t * dx, P[k][1] + t * dy];
  };
  const out = c.map(p => [...p]);
  out[i] = f.back(slide(i, (i - 1 + n) % n));
  out[j] = f.back(slide(j, (j + 1) % n));
  return out;
}

// Turns the outline by `ang` radians (anticlockwise) around its middle.
export function turn(c, ang) {
  const f = metreFrame(mid(c)), co = Math.cos(ang), s = Math.sin(ang);
  return c.map(p => { const [x, y] = f.to(p); return f.back([x * co - y * s, x * s + y * co]); });
}

// Direction (radians) from point a to point b.
export function bearing(a, b) {
  const [x, y] = metreFrame(a).to(b);
  return Math.atan2(y, x);
}

// Direction (radians) of the outline's longest wall.
function mainAngle(c) {
  const f = metreFrame(c[0]), P = c.map(f.to);
  let best = -1, ang = 0;
  P.forEach((p, i) => {
    const q = P[(i + 1) % P.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len > best) { best = len; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); }
  });
  return ang;
}

// If turning c by `ang` lands within 4° of lining up with `target`, nudges it the rest of the way.
export function snapTurn(c, ang, target) {
  const q = Math.PI / 2, d = target - (mainAngle(c) + ang);
  const off = d - q * Math.round(d / q); // walls only need to match up to a quarter turn
  return Math.abs(off) < 4 * Math.PI / 180 ? { ang: ang + off, lined: true } : { ang, lined: false };
}

// The same outline with its middle moved to `at`.
export function moveTo(c, at) {
  const f = metreFrame(mid(c)), g = metreFrame(at);
  return c.map(p => g.back(f.to(p)));
}

// Length and width in whole metres, e.g. "32 m × 14 m".
export function sizeText(c) {
  const f = metreFrame(c[0]), r = rectOf(c.map(f.to));
  const a = Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]), b = Math.hypot(r[2][0] - r[1][0], r[2][1] - r[1][1]);
  return `${Math.round(a)} m × ${Math.round(b)} m`;
}
