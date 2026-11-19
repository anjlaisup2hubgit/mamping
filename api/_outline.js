import { askJSON, okImages } from "./_claude.js";

// Gemini is trained to give positions as [y, x] on a 0–1000 grid, so we ask for that and turn it into 768-pixel [x, y] here.
const toPixel = ([y, x]) => [Math.round(x * 7.68) / 10, Math.round(y * 7.68) / 10];

// One malformed suggestion must not discard the other roofs in the picture.
const validRoof = b => {
  const p = b?.points;
  if (!Array.isArray(p) || p.length < 3 || p.length > 40 || !Number.isFinite(b.confidence) || b.confidence < 0 || b.confidence > 1) return false;
  if (!p.every(q => Array.isArray(q) && q.length === 2 && q.every(v => Number.isFinite(v) && v >= 0 && v <= 1000))) return false;
  const area = p.reduce((sum, [x, y], i) => { const q = p[(i + 1) % p.length]; return sum + x * q[1] - q[0] * y; }, 0);
  return Math.abs(area) >= 2;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const controller = new AbortController();
  const disconnected = () => { if (!res.writableEnded) controller.abort(); };
  res.on?.("close", disconnected);
  try {
    const { image } = req.body || {};
    if (!okImages([image])) return res.status(400).json({ error: "Choose a satellite picture before scanning.", code: "BAD_IMAGE" });
    const out = await askJSON([image],
`This is a satellite image (north up). Trace the roof outline of every separate building you can see clearly.
JSON key: buildings, an array of {points: [[y,x],...] as the roof corners, each [y, x] normalized to 0-1000 (4 to 12 points, clockwise), confidence: 0 to 1}. Skip trees, cars, shadows and unclear shapes.`, 3000, req.headers["x-gemini-key"], req.signal ? AbortSignal.any([req.signal, controller.signal]) : controller.signal);
    if (!Array.isArray(out?.buildings)) return res.status(502).json({ error: "Gemini returned no building list. Retry this picture.", code: "INVALID_AI_RESPONSE" });
    const buildings = out.buildings.filter(validRoof).map(({ points, confidence }) => ({ points: points.map(toPixel), confidence }));
    const discarded = out.buildings.length - buildings.length;
    if (discarded && !buildings.length) return res.status(502).json({ error: "Gemini returned invalid roof outlines. Retry this picture.", code: "INVALID_AI_RESPONSE" });
    res.json({ buildings, discarded });
  } catch (e) { if (!res.destroyed) res.status(e.status || 500).json({ error: String(e.message || e), code: e.code || "SCAN_FAILED" }); }
  finally { res.off?.("close", disconnected); }
}
