// Roads in one map square, read from the free OpenFreeMap tiles the street map already uses (fast, and never busy like Overpass).
// GET /api/roads?x=&y= (a zoom 14 tile, about 2 km wide) returns [[[lat, lng], ...], ...], one list of points per road.
import { readLines } from "./_vectorTile.js";

const Z = 14; // the most detailed zoom these tiles have
const SKIP = new Set(["rail", "transit", "ferry", "aerialway"]); // only roads and paths, like OpenStreetMap's "highway"

// OpenFreeMap puts out new tiles about every week under a new address, so look it up (checked every 6 hours).
let url = null, urlAt = 0;
async function tileUrl() {
  if (url && Date.now() - urlAt < 6 * 3600e3) return url;
  url = (await (await fetch("https://tiles.openfreemap.org/planet")).json()).tiles[0];
  urlAt = Date.now();
  return url;
}

export default async function handler(req, res) {
  const x = +req.query.x, y = +req.query.y;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= 2 ** Z || y >= 2 ** Z) return res.status(400).json({ error: "bad tile" });
  try {
    const r = await fetch((await tileUrl()).replace("{z}", Z).replace("{x}", x).replace("{y}", y));
    if (r.status === 204 || r.status === 404) return res.json([]); // empty square, e.g. sea
    if (!r.ok) throw new Error("tile " + r.status);
    const roads = readLines(Buffer.from(await r.arrayBuffer()), Z, x, y, "transportation").filter(l => !SKIP.has(l.props.class)).map(l => l.coords);
    res.setHeader("Cache-Control", "public, s-maxage=604800, stale-while-revalidate=86400"); // roads rarely change; serve from cache for a week
    res.json(roads);
  } catch (e) { res.status(502).json({ error: String(e.message || e) }); }
}
