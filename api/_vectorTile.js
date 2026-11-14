// Turns one map tile (Mapbox vector tile format) into building outlines or road lines in [lat, lng] with their details.

function reader(buf) {
  let pos = 0;
  const varint = () => { let r = 0, shift = 1, b; do { b = buf[pos++]; r += (b & 0x7f) * shift; shift *= 128; } while (b & 0x80); return r; };
  return {
    more: () => pos < buf.length,
    key: () => { const k = varint(); return [k >> 3, k & 7]; },
    varint,
    bytes: () => { const n = varint(); const b = buf.subarray(pos, pos + n); pos += n; return b; },
    double: () => { const v = buf.readDoubleLE(pos); pos += 8; return v; },
    float: () => { const v = buf.readFloatLE(pos); pos += 4; return v; },
    skip: type => { if (type === 0) varint(); else if (type === 1) pos += 8; else if (type === 2) pos += varint(); else if (type === 5) pos += 4; }
  };
}

const packed = b => { const r = reader(b), out = []; while (r.more()) out.push(r.varint()); return out; };
const zigzag = n => (n % 2 ? -(n + 1) / 2 : n / 2);

function value(b) {
  const r = reader(b);
  while (r.more()) {
    const [f, t] = r.key();
    if (f === 1) return r.bytes().toString("utf8");
    if (f === 2) return r.float();
    if (f === 3) return r.double();
    if (f === 4 || f === 5) return r.varint();
    if (f === 6) return zigzag(r.varint());
    if (f === 7) return !!r.varint();
    r.skip(t);
  }
  return null;
}

// Drawing commands -> rings of tile pixel points.
function rings(cmds) {
  const out = [];
  let i = 0, x = 0, y = 0, ring = null;
  while (i < cmds.length) {
    const id = cmds[i] & 7, count = cmds[i++] >> 3;
    if (id === 7) { if (ring) out.push(ring); ring = null; continue; } // close the shape
    for (let k = 0; k < count; k++) {
      x += zigzag(cmds[i++]); y += zigzag(cmds[i++]);
      if (id === 1) { if (ring) out.push(ring); ring = []; }
      ring.push([x, y]);
    }
  }
  if (ring) out.push(ring); // lines are never closed, so the last one ends here
  return out;
}

// Returns [{ props, coords: [[lat, lng], ...] }] for the outer ring of every building in the layer.
export const readBuildings = (buf, z, tx, ty, layerName = "building") =>
  readLayer(buf, z, tx, ty, layerName, 3).map(f => ({ props: f.props, coords: f.parts[0] })).filter(f => f.coords.length >= 3);

// Returns [{ props, coords: [[lat, lng], ...] }] for every line (e.g. road) in the layer.
export const readLines = (buf, z, tx, ty, layerName) =>
  readLayer(buf, z, tx, ty, layerName, 2).flatMap(f => f.parts.filter(p => p.length > 1).map(coords => ({ props: f.props, coords })));

// Every feature of one shape type in the layer (2 = lines, 3 = polygons), as { props, parts: [[[lat, lng], ...], ...] }.
function readLayer(buf, z, tx, ty, layerName, wanted) {
  const out = [], t = reader(buf);
  while (t.more()) {
    const [f, type] = t.key();
    if (f !== 3) { t.skip(type); continue; }
    const l = reader(t.bytes());
    let name = "", extent = 4096;
    const keys = [], values = [], feats = [];
    while (l.more()) {
      const [lf, lt] = l.key();
      if (lf === 1) name = l.bytes().toString("utf8");
      else if (lf === 2) feats.push(l.bytes());
      else if (lf === 3) keys.push(l.bytes().toString("utf8"));
      else if (lf === 4) values.push(value(l.bytes()));
      else if (lf === 5) extent = l.varint();
      else l.skip(lt);
    }
    if (name !== layerName) continue;
    for (const fb of feats) {
      const fr = reader(fb);
      let tags = [], geom = [], gtype = 0;
      while (fr.more()) {
        const [ff, ft] = fr.key();
        if (ff === 2) tags = packed(fr.bytes());
        else if (ff === 3) gtype = fr.varint();
        else if (ff === 4) geom = packed(fr.bytes());
        else fr.skip(ft);
      }
      if (gtype !== wanted) continue;
      const props = {};
      for (let k = 0; k < tags.length; k += 2) props[keys[tags[k]]] = values[tags[k + 1]];
      const parts = rings(geom);
      if (!parts.length) continue;
      const n = 2 ** z;
      out.push({ props, parts: parts.map(part => part.map(([px, py]) => {
        const lng = ((tx + px / extent) / n) * 360 - 180;
        const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + py / extent)) / n))) * 180) / Math.PI;
        return [+lat.toFixed(7), +lng.toFixed(7)];
      })) });
    }
  }
  return out;
}
