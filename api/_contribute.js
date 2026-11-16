import { put } from "@vercel/blob";
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const b = req.body || {};
    const lat = num(b.lat), lng = num(b.lng);
    if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ error: "bad location" });
    const media = u => (typeof u === "string" && /^https:\/\/[a-z0-9.-]+\.public\.blob\.vercel-storage\.com\//.test(u) ? u : null);
    const rec = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      kind: b.kind === "outline" ? "outline" : "video",
      lat, lng, buildingId: num(b.buildingId), name: str(b.name, 120), height: num(b.height), levels: num(b.levels),
      comment: str(b.comment, 280), at: new Date().toISOString(), secs: num(b.secs),
      videoUrl: media(b.videoUrl), photoUrl: media(b.photoUrl),
      polygon: Array.isArray(b.polygon) ? b.polygon.slice(0, 40).map(p => [num(p[0]), num(p[1])]).filter(p => p[0] !== null && p[1] !== null) : null
    };
    await put(`meta/${rec.id}.json`, JSON.stringify(rec), { access: "public", contentType: "application/json", addRandomSuffix: false });
    res.json({ ok: true, id: rec.id });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
