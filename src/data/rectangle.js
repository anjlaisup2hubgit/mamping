// Quick rectangles from a few taps.
// 2 taps = opposite corners; the walls copy the angle of the nearest road (or mapped building next door).
// 3 taps = two corners along one wall, then any point on the far wall.
// Maths is done in metres around the first tap so corners are true right angles.
import { metreFrame as frame } from "./geo.js";

// Angle (radians) of the nearest line within `max` metres of point p, or null.
// lines = lists of [lat, lng] (roads or building outlines).
function nearestAngle(p, lines, max) {
  const f = frame(p);
  let best = max, ang = null;
  lines.forEach(line => line.slice(1).forEach((q, i) => {
    const [ax, ay] = f.to(line[i]), [bx, by] = f.to(q), dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    if (!len2) return;
    const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)); // closest spot on this piece to p (p is 0,0)
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) { best = d; ang = Math.atan2(dy, dx); }
  }));
  return ang;
}

// Which way the walls should run around point p: nearest road, else nearest building, else north.
export function wallAngle(p, roads, buildings) {
  const closed = buildings.map(c => [...c, c[0]]);
  return nearestAngle(p, roads, 60) ?? nearestAngle(p, closed, 30) ?? 0;
}

// Rectangle with opposite corners a and b, walls turned by `ang` radians.
export function rectFrom2(a, b, ang) {
  const f = frame(a), [dx, dy] = f.to(b), c = Math.cos(ang), s = Math.sin(ang);
  const along = dx * c + dy * s, across = -dx * s + dy * c;
  return [[0, 0], [along * c, along * s], [dx, dy], [-across * s, across * c]].map(f.back);
}

// Rectangle with one wall from a to b, and the far wall passing through p.
export function rectFrom3(a, b, p) {
  const f = frame(a), [bx, by] = f.to(b), [px, py] = f.to(p), len = Math.hypot(bx, by) || 1;
  const nx = -by / len, ny = bx / len, h = px * nx + py * ny; // how far p is from the first wall
  return [[0, 0], [bx, by], [bx + h * nx, by + h * ny], [h * nx, h * ny]].map(f.back);
}
