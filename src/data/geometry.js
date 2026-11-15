// Checks roof shapes before they are saved to the public map.
import { metreFrame } from "./geo.js";

const EPS = 1e-8;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const ring = points => points.length > 1 && same(points[0], points.at(-1)) ? points.slice(0, -1) : points;
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onLine = (a, b, p) => Math.abs(cross(a, b, p)) <= EPS &&
  p[0] >= Math.min(a[0], b[0]) - EPS && p[0] <= Math.max(a[0], b[0]) + EPS &&
  p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS;

function intersects(a, b, c, d, touching = true) {
  const ab = [cross(a, b, c), cross(a, b, d)], cd = [cross(c, d, a), cross(c, d, b)];
  if (ab[0] * ab[1] < -EPS && cd[0] * cd[1] < -EPS) return true;
  return touching && (onLine(a, b, c) || onLine(a, b, d) || onLine(c, d, a) || onLine(c, d, b));
}

const validPoints = points => Array.isArray(points) && points.length >= 3 && points.every(p =>
  Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));

// Returns an explanation to show the user, or null for a usable latitude/longitude polygon.
export function validatePolygon(points, { pixels = false } = {}) {
  if (!validPoints(points)) return "A building needs at least three real corners.";
  if (!pixels && points.some(([lat, lng]) => Math.abs(lat) > 90 || Math.abs(lng) > 180)) return "A corner is outside the map.";
  const outline = ring(points);
  if (outline.length < 3) return "A building needs at least three different corners.";
  const p = pixels ? outline : outline.map(metreFrame(outline[0]).to), n = p.length;
  for (let i = 0; i < n; i++) {
    if (Math.hypot(p[i][0] - p[(i + 1) % n][0], p[i][1] - p[(i + 1) % n][1]) < 0.01) return "Two corners are in the same place.";
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (intersects(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return "The building's walls cross or touch each other. Move its corners first.";
    }
  }
  const area = Math.abs(p.reduce((sum, a, i) => sum + a[0] * p[(i + 1) % n][1] - p[(i + 1) % n][0] * a[1], 0)) / 2;
  return area < 0.5 ? "This outline is too small or flat to be a building." : null;
}

function strictlyInside(point, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i];
    if (onLine(a, b, point)) return false;
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

// Detects crossed walls as well as contained corners; shared boundaries alone are allowed.
export function polygonsOverlap(first, second) {
  if (!validPoints(first) || !validPoints(second)) return false;
  const { to } = metreFrame(first[0]), a = ring(first).map(to), b = ring(second).map(to);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    if (intersects(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length], false)) return true;
  }
  if (a.some(p => strictlyInside(p, b)) || b.some(p => strictlyInside(p, a))) return true;
  // Coincident rectangles have no strictly-inside corners, but their edge midpoints face the same interior.
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
    if (!len) continue;
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    for (const sign of [-1, 1]) {
      const near = [mid[0] + sign * dy / len * 0.001, mid[1] - sign * dx / len * 0.001];
      if (strictlyInside(near, a) && strictlyInside(near, b)) return true;
    }
  }
  return false;
}
