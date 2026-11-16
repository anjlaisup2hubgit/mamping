// Ready-made building outlines (found by Microsoft's and Google's AI) that OpenStreetMap does not have yet.
// GET /api/ready?x=&y= returns the ones in one small map square (zoom 16 tile) as [{ coords, center, from }].
// They come from Overture Maps, which joins those datasets and already drops the ones that clash with OpenStreetMap.
import { openPmtiles } from "./_pmtiles.js";
import { readBuildings } from "./_vectorTile.js";

const BUCKET = "https://overturemaps-extras-us-west-2.s3.us-west-2.amazonaws.com";
const Z = 16, PARENT = 14; // the data file has detail down to zoom 14; one zoom 14 tile holds 16 x 16 of ours

// Overture publishes a new file about every month and deletes old ones, so look up the newest (checked every 6 hours).
let file = null, fileAt = 0;
async function newestFile() {
  if (file && Date.now() - fileAt < 6 * 3600e3) return file;
  const xml = await (await fetch(`${BUCKET}/?list-type=2&prefix=tiles/&delimiter=/`)).text();
  const latest = [...xml.matchAll(/<Prefix>(tiles\/[^<]+\/)<\/Prefix>/g)].map(m => m[1]).sort().at(-1);
  if (!latest) throw new Error("no Overture release found");
  file = { get: await openPmtiles(`${BUCKET}/${latest}buildings.pmtiles`) };
  fileAt = Date.now();
  return file;
}

// A few big tiles kept in memory, because neighbouring squares share one.
const parents = new Map();
async function parentTile(px, py) {
  const k = px + "/" + py;
  if (!parents.has(k)) {
    const buf = await (await newestFile()).get(PARENT, px, py);
    parents.set(k, buf ? readBuildings(buf, PARENT, px, py).filter(b => b.props["@geometry_source"] !== "OpenStreetMap") : []);
    if (parents.size > 6) parents.delete(parents.keys().next().value);
  }
  return parents.get(k);
}

const tileOf = (lat, lng, z) => {
  const n = 2 ** z, r = lat * Math.PI / 180;
  return [Math.floor((lng + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)];
};
const mid = c => [c.reduce((a, p) => a + p[0], 0) / c.length, c.reduce((a, p) => a + p[1], 0) / c.length];

export default async function handler(req, res) {
  const x = +req.query.x, y = +req.query.y;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= 2 ** Z || y >= 2 ** Z) return res.status(400).json({ error: "bad tile" });
  try {
    const shift = 2 ** (Z - PARENT);
    const list = (await parentTile(Math.floor(x / shift), Math.floor(y / shift)))
      .map(b => ({ coords: b.coords.slice(0, 40), center: mid(b.coords), from: b.props["@geometry_source"] }))
      .filter(b => { const [tx, ty] = tileOf(b.center[0], b.center[1], Z); return tx === x && ty === y; }); // each building belongs to the square its middle is in
    res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400"); // the same square is served from cache for a week
    res.json(list);
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
}
