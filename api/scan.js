// Saves and loads each OpenStreetMap user's orange "missing building" boxes. GET = load, POST = save.
// Kept in an Upstash Redis database (a fast online store for small saves), one entry per user.
import { Redis } from "@upstash/redis";
import { osmUser } from "./_osmUser.js";

// Works with the names Upstash gives (UPSTASH_...) and the names Vercel gives when added there (KV_...).
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
});

const num = v => (typeof v === "number" && isFinite(v) ? v : null);
const point = p => (Array.isArray(p) && num(p[0]) !== null && num(p[1]) !== null ? [p[0], p[1]] : null);

function cleanBox(b) {
  const coords = (Array.isArray(b?.coords) ? b.coords.slice(0, 40) : []).map(point).filter(Boolean);
  const center = point(b?.center);
  const from = typeof b.from === "string" ? b.from.slice(0, 60) : undefined; // ready-made outline source, e.g. Microsoft
  return coords.length >= 3 && center ? { coords, center, confidence: num(b.confidence), from, keep: b.keep === true } : null;
}

export default async function handler(req, res) {
  try {
    const user = await osmUser(req);
    if (!user) return res.status(401).json({ error: "log in to OpenStreetMap first" });
    const key = `scans:${user.site}-${user.id}`;
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "GET") return res.json((await redis.get(key)) || []);
    if (req.method === "POST") {
      const boxes = (Array.isArray(req.body?.boxes) ? req.body.boxes.slice(0, 1000) : []).map(cleanBox).filter(Boolean);
      await redis.set(key, boxes);
      return res.json({ ok: true, saved: boxes.length });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
