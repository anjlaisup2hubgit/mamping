import { askJSON, okImages } from "./_claude.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    console.log("[outline] AI called");
    const { image } = req.body || {};
    if (!okImages([image])) return res.status(400).json({ error: "bad image" });
    const out = await askJSON([image],
`This is a 768 by 768 pixel satellite image (north up). Trace the roof outline of every separate building you can see clearly.
JSON key: buildings, an array of {points: [[x,y],...] in pixel coordinates (4 to 12 points, clockwise, x right, y down), confidence: 0 to 1}. Skip trees, cars, shadows and unclear shapes.`, 3000, req.headers["x-gemini-key"]);
    console.log("[outline] AI replied, buildings:", (out.buildings || []).length);
    res.json(out);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
