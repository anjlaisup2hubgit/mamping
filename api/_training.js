// Pictures and editable labels stay on the training workstation; keeping a scene confirms all its roofs.
import fs from "node:fs";
import { at, readJSON, writeJSON, localOnly, safeName } from "./_trainingFiles.js";
import { forwardTraining } from "./_trainingProxy.js";

function labelsOf(value) {
  if (typeof value !== "string" || value.length > 300000) throw new Error("Bad labels.");
  return value.trim().split(/\r?\n/).filter(Boolean).map(line => {
    const values = line.trim().split(/\s+/).map(Number);
    const [kind, x, y, w, h] = values;
    if (values.length !== 5 || kind !== 0 || !values.every(Number.isFinite) || w <= 0 || h <= 0 ||
      x - w / 2 < -1e-6 || y - h / 2 < -1e-6 || x + w / 2 > 1 + 1e-6 || y + h / 2 > 1 + 1e-6) throw new Error("A roof box is outside the picture.");
    return `0 ${[x, y, w, h].map(n => n.toFixed(6)).join(" ")}`;
  }).join("\n") + (value.trim() ? "\n" : "");
}

function sample(name, status, metadata) {
  const details = metadata[name] || { revision: 1, reviewedRevision: status[name] === "kept" ? 1 : null };
  const reviewed = details.reviewedRevision === details.revision;
  return { name, labels: fs.readFileSync(at("labels", name + ".txt"), "utf8"), status: status[name] === "kept" && !reviewed ? "" : status[name] || "", ...details };
}

export default async function handler(req, res) {
  if (await forwardTraining(req, res)) return;
  if (localOnly(res)) return;
  const status = readJSON(at("status.json")), metadata = readJSON(at("samples.json"));
  if (req.method === "GET") {
    const names = fs.existsSync(at("labels")) ? fs.readdirSync(at("labels")).filter(f => f.endsWith(".txt")).sort() : [];
    return res.json(names.filter(f => safeName(f.slice(0, -4))).map(f => sample(f.slice(0, -4), status, metadata)));
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST." });
  const { name, image, labels, status: choice, expectedRevision, centre, bounds } = req.body || {};
  if (!safeName(name)) return res.status(400).json({ error: "Bad picture name." });
  if (choice !== undefined && !["draft", "kept", "dropped"].includes(choice)) return res.status(400).json({ error: "Bad review choice." });
  const labelFile = at("labels", name + ".txt"), imageFile = at("images", name + ".jpg");
  const exists = fs.existsSync(labelFile), old = metadata[name] || { revision: exists ? 1 : 0 };
  if (expectedRevision !== undefined && expectedRevision !== old.revision) return res.status(409).json({ error: "This picture changed in another tab. Reload it before saving.", revision: old.revision });
  if (!image && !exists) return res.status(404).json({ error: "Picture not found." });
  let nextLabels;
  try { nextLabels = labels === undefined && exists ? fs.readFileSync(labelFile, "utf8") : labelsOf(labels); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  let bytes;
  if (image !== undefined) {
    if (typeof image !== "string" || image.length > 4e6 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return res.status(400).json({ error: "Bad picture data." });
    bytes = Buffer.from(image, "base64");
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return res.status(400).json({ error: "Use a JPEG picture." });
  }
  const imageChanged = bytes && (!fs.existsSync(imageFile) || !bytes.equals(fs.readFileSync(imageFile)));
  const changed = !exists || imageChanged || nextLabels !== fs.readFileSync(labelFile, "utf8");
  fs.mkdirSync(at("labels"), { recursive: true });
  fs.mkdirSync(at("images"), { recursive: true });
  if (bytes) { fs.writeFileSync(imageFile + ".tmp", bytes); fs.renameSync(imageFile + ".tmp", imageFile); }
  fs.writeFileSync(labelFile + ".tmp", nextLabels); fs.renameSync(labelFile + ".tmp", labelFile);
  const revision = Math.max(1, old.revision + (changed ? 1 : 0));
  if (changed || choice === "draft") status[name] = "";
  if (choice === "kept" || choice === "dropped") status[name] = choice;
  const location = Array.isArray(centre) && centre.length === 2 && centre.every(Number.isFinite) ? { centre } : {};
  metadata[name] = { ...old, ...location, ...(bounds ? { bounds } : {}), revision,
    reviewedRevision: status[name] === "kept" ? revision : null, updatedAt: new Date().toISOString() };
  writeJSON(at("samples.json"), metadata);
  writeJSON(at("status.json"), status);
  res.json({ ok: true, revision, status: status[name] || "", reviewedRevision: metadata[name].reviewedRevision });
}
