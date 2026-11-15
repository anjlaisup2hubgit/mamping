// Local training files use atomic replacement so interrupted jobs leave readable metadata.
import fs from "node:fs";
import path from "node:path";

export const root = () => path.resolve(process.env.TRAINING_DATA_DIR || "training");
export const at = (...parts) => path.join(root(), ...parts);
export function readJSON(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
export function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
  fs.renameSync(temporary, file);
}
export function localOnly(res) {
  if (!process.env.VERCEL) return false;
  res.status(503).json({ error: "Training runs on a local workstation. Start node dev-server.js there, or connect a persistent training worker.", code: "LOCAL_TRAINING_ONLY" });
  return true;
}
export const safeName = name => typeof name === "string" && /^[a-zA-Z0-9][\w.-]{0,119}$/.test(name);
