// Small map maths with no screens involved.
export const mid = c => [c.reduce((a, p) => a + p[0], 0) / c.length, c.reduce((a, p) => a + p[1], 0) / c.length];

// Is point [lat, lng] inside the polygon?
export function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > pt[0]) !== (yj > pt[0]) && pt[1] < (xj - xi) * (pt[0] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Distance in metres between two points.
export function dist(a, b, c, d) {
  const R = 6371000, t = x => x * Math.PI / 180;
  const h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(d - b) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Neat rectangle around [x, y] points, tilted like their longest edge.
export function rectOf(pts) {
  let best = 0, ang = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len > best) { best = len; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); }
  });
  const c = Math.cos(ang), s = Math.sin(ang);
  const r = pts.map(([x, y]) => [x * c + y * s, -x * s + y * c]);
  const [x0, x1] = [Math.min(...r.map(p => p[0])), Math.max(...r.map(p => p[0]))];
  const [y0, y1] = [Math.min(...r.map(p => p[1])), Math.max(...r.map(p => p[1]))];
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([u, v]) => [u * c - v * s, u * s + v * c]);
}

// Turns a wobbly [lat, lng] outline into a neat rectangle (worked out in metres so the corners are true right angles).
export function squareUp(coords) {
  const [lat0, lng0] = coords[0], kx = Math.cos(lat0 * Math.PI / 180) * 111320, ky = 110540;
  const pts = coords.map(([lat, lng]) => [(lng - lng0) * kx, (lat - lat0) * ky]);
  return rectOf(pts).map(([x, y]) => [lat0 + y / ky, lng0 + x / kx]);
}
