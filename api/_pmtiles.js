// Reads single map tiles out of a huge online .pmtiles file, downloading only the bytes needed (range requests).
import zlib from "node:zlib";

const unzip = b => (b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b);

// Tile number used inside .pmtiles files (counts tiles along a Hilbert curve, zoom by zoom).
export function tileId(z, x, y) {
  let acc = 0;
  for (let t = 0; t < z; t++) acc += 4 ** t;
  const n = 2 ** z;
  let d = 0;
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } [x, y] = [y, x]; }
  }
  return acc + d;
}

function readDirectory(buf) {
  let pos = 0;
  const varint = () => { let r = 0, shift = 1, b; do { b = buf[pos++]; r += (b & 0x7f) * shift; shift *= 128; } while (b & 0x80); return r; };
  const n = varint(), list = Array.from({ length: n }, () => ({}));
  let last = 0;
  list.forEach(e => { last += varint(); e.id = last; });
  list.forEach(e => { e.run = varint(); });
  list.forEach(e => { e.len = varint(); });
  list.forEach((e, i) => { const v = varint(); e.off = v === 0 && i > 0 ? list[i - 1].off + list[i - 1].len : v - 1; });
  return list;
}

export async function openPmtiles(url) {
  const range = async (o, n) => {
    for (let tries = 1; ; tries++) { // big file servers sometimes drop a connection: try up to 4 times
      try {
        const r = await fetch(url, { headers: { Range: `bytes=${o}-${o + n - 1}` } });
        if (!r.ok) throw new Error("download failed " + r.status);
        return Buffer.from(await r.arrayBuffer());
      } catch (e) { if (tries === 4) throw e; await new Promise(ok => setTimeout(ok, 1000 * tries)); }
    }
  };
  const h = await range(0, 127), u = o => Number(h.readBigUInt64LE(o));
  const head = { rootOff: u(8), rootLen: u(16), leafOff: u(40), dataOff: u(56) };
  const dirs = new Map();
  const dir = async (off, len) => {
    const k = off + ":" + len;
    if (!dirs.has(k)) dirs.set(k, readDirectory(unzip(await range(off, len))));
    return dirs.get(k);
  };
  // Returns the raw (unzipped) vector tile, or null if the tile is empty.
  return async function getTile(z, x, y) {
    const id = tileId(z, x, y);
    let entries = await dir(head.rootOff, head.rootLen);
    for (let depth = 0; depth < 4; depth++) {
      let lo = 0, hi = entries.length - 1, hit = null;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (entries[m].id <= id) { hit = entries[m]; lo = m + 1; } else hi = m - 1; }
      if (!hit) return null;
      if (hit.run === 0) { entries = await dir(head.leafOff + hit.off, hit.len); continue; } // a pointer to a deeper directory
      if (id >= hit.id + hit.run) return null;
      return unzip(await range(head.dataOff + hit.off, hit.len));
    }
    return null;
  };
}
