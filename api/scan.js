// Saves and loads each OpenStreetMap user's orange "missing building" boxes. GET = load, POST = save.
import { put, list } from "@vercel/blob";
import { osmUser } from "./_osmUser.js";

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
    const path = `scans/${user.site}-${user.id}.json`;
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "GET") {
      const { blobs } = await list({ prefix: path });
      if (!blobs.length) return res.json([]);
      const saved = await fetch(blobs[0].url + "?t=" + Date.now()); // fresh copy, not the cached one
      return res.json(await saved.json());
    }
    if (req.method === "POST") {
      const boxes = (Array.isArray(req.body?.boxes) ? req.body.boxes.slice(0, 1000) : []).map(cleanBox).filter(Boolean);
      await put(path, JSON.stringify(boxes), { access: "public", contentType: "application/json", addRandomSuffix: false });
      return res.json({ ok: true, saved: boxes.length });
    }
    res.status(405).end();
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
