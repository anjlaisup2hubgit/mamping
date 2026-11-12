import { askJSON, okImages } from "./_claude.js";
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { frames, candidates = [], lat, lng } = req.body || {};
    if (!okImages(frames)) return res.status(400).json({ error: "bad frames" });
    const list = candidates.slice(0, 15).map(c => `id ${c.id}: name=${c.name || "none"}, osmHeight=${c.height ?? "none"}, distance=${c.dist}m`).join("\n");
    const out = await askJSON(frames,
`These frames come from a phone video recorded at GPS ${lat},${lng}. They show the building the person is filming.
OpenStreetMap buildings near the phone:
${list || "(none)"}
Pick the candidate that best matches the filmed building (use distance, shape, floors and any signs). Estimate floors by counting them, and height in metres (about 3.2 m per floor, more for shops). Read any sign for the business name.
JSON keys: buildingId (number or null), name (string or null), floors (number or null), heightM (number or null), confidence (0 to 1), note (short string).`, 1200, req.headers["x-gemini-key"]);
    res.json(out);
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
}
