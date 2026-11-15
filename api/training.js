// The training/ folder (only on your own computer, never on the live site): saves a satellite picture with its building labels,
// lists the saved pictures, and remembers which ones you kept or dropped when checking them.
import fs from "node:fs";
import path from "node:path";

const at = (...parts) => path.join("training", ...parts);
const STATUS = at("status.json"); // { picture name: "kept" or "dropped" }
const readStatus = () => { try { return JSON.parse(fs.readFileSync(STATUS, "utf8")); } catch { return {}; } };

function listPictures() {
  if (!fs.existsSync(at("labels"))) return [];
  const status = readStatus();
  return fs.readdirSync(at("labels")).filter(f => f.endsWith(".txt")).map(f => {
    const name = f.slice(0, -4);
    return { name, labels: fs.readFileSync(at("labels", f), "utf8"), status: status[name] || "" };
  });
}

export default async function handler(req, res) {
  if (process.env.VERCEL) return res.status(404).json({ error: "Only works on your own computer." });
  if (req.method === "GET") return res.json(listPictures());
  if (req.method !== "POST") return res.status(404).json({ error: "Not found." });
  const { name, image, labels, status } = req.body || {};
  if (!/^[\w.-]+$/.test(name || "")) return res.status(400).json({ error: "Bad picture." });

  if (image) { // a new picture from a scan
    if (typeof labels !== "string") return res.status(400).json({ error: "Bad picture." });
    for (const dir of ["images", "labels"]) fs.mkdirSync(at(dir), { recursive: true });
    fs.writeFileSync(at("images", name + ".jpg"), Buffer.from(image, "base64"));
    fs.writeFileSync(at("labels", name + ".txt"), labels);
    return res.json({ ok: true });
  }

  // checking a saved picture: keep it (with the roofs that are left) or drop it
  if (!["kept", "dropped"].includes(status) || !fs.existsSync(at("labels", name + ".txt"))) return res.status(400).json({ error: "Bad picture." });
  if (typeof labels === "string") fs.writeFileSync(at("labels", name + ".txt"), labels);
  fs.writeFileSync(STATUS, JSON.stringify({ ...readStatus(), [name]: status }, null, 1));
  res.json({ ok: true });
}
