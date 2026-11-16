import { list } from "@vercel/blob";
const d = (a, b, c, e) => { const t = x => x * Math.PI / 180, R = 6371000, h = Math.sin(t(c - a) / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(t(e - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
export default async function handler(req, res) {
  try {
    const lat = +req.query.lat, lng = +req.query.lng, r = Math.min(+req.query.r || 1609, 5000);
    if (!isFinite(lat) || !isFinite(lng)) return res.status(400).json({ error: "bad location" });
    const { blobs } = await list({ prefix: "meta/", limit: 300 });
    const all = await Promise.all(blobs.map(b => fetch(b.url).then(x => x.json()).catch(() => null)));
    res.setHeader("Cache-Control", "s-maxage=30");
    res.json(all.filter(x => x && d(lat, lng, x.lat, x.lng) <= r));
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
