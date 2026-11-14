// Saves one satellite picture and its building labels into the training/ folder (only on your own computer, never on the live site).
import fs from "node:fs";
import path from "node:path";

export default async function handler(req, res) {
  if (process.env.VERCEL || req.method !== "POST") return res.status(404).json({ error: "Only works on your own computer." });
  const { name, image, labels } = req.body || {};
  if (!/^[\w.-]+$/.test(name || "") || !image || typeof labels !== "string") return res.status(400).json({ error: "Bad picture." });
  for (const dir of ["images", "labels"]) fs.mkdirSync(path.join("training", dir), { recursive: true });
  fs.writeFileSync(path.join("training", "images", name + ".jpg"), Buffer.from(image, "base64"));
  fs.writeFileSync(path.join("training", "labels", name + ".txt"), labels);
  res.json({ ok: true });
}
