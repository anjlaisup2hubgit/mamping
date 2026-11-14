// A small 3D drawing of the building, so you can see if the height and roof look right before sending.
// A 1.7 m person stands next to it for scale. Pointed roofs are drawn as a simple pyramid.

const ok = c => (c && CSS.supports("color", c) ? c : null);

// Ground outline [[lat, lng]] -> metres east (x) and north (y) of the first corner.
function toMetres(coords) {
  const [lat0, lng0] = coords[0], k = Math.cos(lat0 * Math.PI / 180);
  return coords.map(([lat, lng]) => [(lng - lng0) * 111320 * k, (lat - lat0) * 110540]);
}

// Seen from the south-west, a little from above. Farther = bigger x + y.
const iso = ([x, y], z) => [(x - y) * 0.866, -(x + y) * 0.5 - z];
const depth = pts => pts.reduce((a, [x, y]) => a + x + y, 0) / pts.length;

function shade(hex, f) { // darkens a colour for walls that face away from the light
  return `color-mix(in srgb, ${hex} ${Math.round(f * 100)}%, black)`;
}

// d = { coords, height, levels, roofShape, roofHeight, wall, roof }
export function preview3d(d) {
  let pts = toMetres(d.coords);
  if (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts = pts.slice(0, -1); // drop the repeated last corner
  const h = d.height || (d.levels ? d.levels * 3.2 : 0);
  if (!h) return `<p class="mid" style="margin:0">Add a height or floors to see the building in 3D.</p>`;
  const pointed = d.roofShape && d.roofShape !== "flat";
  const rh = pointed ? Math.min(d.roofHeight || 2, h) : 0, wallH = h - rh;
  const wall = ok(d.wall) || "#d9d4c7", roof = ok(d.roof) || "#a39e93";
  const faces = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const light = 0.65 + 0.35 * Math.abs(Math.cos(Math.atan2(q[1] - p[1], q[0] - p[0]))); // simple sun from one side
    faces.push({ d: depth([p, q]), fill: shade(wall, light), pts: [iso(p, 0), iso(q, 0), iso(q, wallH), iso(p, wallH)] });
  });
  faces.sort((a, b) => b.d - a.d); // far walls first, near walls drawn on top
  const top = pts.map(p => iso(p, wallH));
  if (pointed) {
    const c = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
    pts.map((p, i) => ({ d: depth([p, pts[(i + 1) % pts.length]]), pts: [iso(p, wallH), iso(pts[(i + 1) % pts.length], wallH), iso(c, h)] }))
      .sort((a, b) => b.d - a.d).forEach(f => faces.push({ ...f, fill: roof }));
  } else faces.push({ fill: roof, pts: top });
  // the person stands 2 m to the south-west of the nearest corner
  const near = pts.reduce((a, p) => (p[0] + p[1] < a[0] + a[1] ? p : a));
  const foot = iso([near[0] - 2, near[1] - 2], 0), head = iso([near[0] - 2, near[1] - 2], 1.7);
  const all = faces.flatMap(f => f.pts).concat([foot, head]);
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]), pad = Math.max(...xs) - Math.min(...xs) > 0 ? 2 : 1;
  const vb = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
  const poly = f => `<polygon points="${f.pts.map(p => p.map(n => n.toFixed(2)).join(",")).join(" ")}" fill="${f.fill}" stroke="#0005" stroke-width="${vb[2] / 300}"/>`;
  const r = Math.max(0.25, vb[3] / 150);
  return `<svg viewBox="${vb.join(" ")}" role="img" aria-label="3D preview, ${Math.round(h)} metres tall" style="width:100%;height:200px;display:block">
    ${faces.map(poly).join("")}
    <line x1="${foot[0]}" y1="${foot[1]}" x2="${head[0]}" y2="${head[1] + r * 2}" stroke="var(--acc)" stroke-width="${r}" stroke-linecap="round"/><circle cx="${head[0]}" cy="${head[1] + r}" r="${r}" fill="var(--acc)"/></svg>
    <p class="mid" style="margin:0;font-size:13px">${Math.round(h * 10) / 10} m tall. The orange figure is a 1.7 m person.</p>`;
}
