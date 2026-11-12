// Turns a true/false picture (mask) of one roof into a few corner points. No screens involved.
const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

// Keep only the blob of the mask that touches the start point.
function blobAt(mask, w, h, sx, sy) {
  if (!mask[sy * w + sx]) return null;
  const blob = new Uint8Array(w * h), stack = [[sx, sy]];
  blob[sy * w + sx] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx] && !blob[ny * w + nx]) { blob[ny * w + nx] = 1; stack.push([nx, ny]); }
    }
  }
  return blob;
}

// Walk around the outside edge of the blob, starting from its left-most pixel on the start row.
function outline(blob, w, h, sx, sy) {
  const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && blob[y * w + x] === 1;
  let x = sx; while (has(x - 1, sy)) x--;
  const pts = [[x, sy]], startX = x;
  let cx = x, cy = sy, bx = x - 1, by = sy;
  for (let n = 0; n < w * h; n++) {
    const k0 = DIRS.findIndex(([dx, dy]) => cx + dx === bx && cy + dy === by);
    let moved = false;
    for (let k = 1; k <= 8 && !moved; k++) {
      const i = (k0 + k) % 8, nx = cx + DIRS[i][0], ny = cy + DIRS[i][1];
      if (has(nx, ny)) {
        const back = DIRS[(i + 7) % 8];
        bx = cx + back[0]; by = cy + back[1]; cx = nx; cy = ny; moved = true;
      }
    }
    if (!moved || (cx === startX && cy === sy)) break;
    pts.push([cx, cy]);
  }
  return pts;
}

// Drop points that barely change the shape (Douglas-Peucker).
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let far = 0, at = 0;
  pts.forEach((p, i) => {
    const d = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len;
    if (d > far) { far = d; at = i; }
  });
  if (far <= eps) return [a, b];
  return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
}

// mask: flat array of w*h (truthy = roof). start: [x, y] pixel known to be on the roof.
export function maskPolygon(mask, w, h, [px, py], maxPoints = 12) {
  const sx = Math.round(px), sy = Math.round(py);
  const blob = blobAt(mask, w, h, sx, sy);
  if (!blob) return null;
  const edge = outline(blob, w, h, sx, sy);
  if (edge.length < 8) return null;
  // Split the loop at its farthest point so each half simplifies as an open line.
  const far = edge.reduce((m, p, i) => (Math.hypot(p[0] - edge[0][0], p[1] - edge[0][1]) > m.d ? { d: Math.hypot(p[0] - edge[0][0], p[1] - edge[0][1]), i } : m), { d: 0, i: 0 }).i;
  for (let eps = 2; eps < 60; eps *= 1.3) {
    let poly = [...simplify(edge.slice(0, far + 1), eps).slice(0, -1), ...simplify([...edge.slice(far), edge[0]], eps).slice(0, -1)];
    poly = poly.filter((p, i) => { // the split point can sit mid-edge: drop corners that are not really corners
      const a = poly[(i + poly.length - 1) % poly.length], b = poly[(i + 1) % poly.length];
      return Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1) > eps;
    });
    if (poly.length <= maxPoints) return poly.length >= 3 ? poly.map(([x, y]) => [x + 0.5, y + 0.5]) : null;
  }
  return null;
}
