// Serve reviewed-scene imagery from the same persistent worker as its labels.
import fs from "node:fs";
import { at, safeName, localOnly } from "./_trainingFiles.js";
import { forwardTraining } from "./_trainingProxy.js";

export default async function handler(req, res) {
  if (await forwardTraining(req, res) || localOnly(res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET." });
  const name = req.query?.name;
  if (!safeName(name)) return res.status(400).json({ error: "Bad picture name." });
  const file = at("images", name + ".jpg");
  if (!fs.existsSync(file)) return res.status(404).json({ error: "Picture not found." });
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "no-store");
  res.end(fs.readFileSync(file));
}
