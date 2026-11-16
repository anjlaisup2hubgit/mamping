// A candidate needs a real, separate evaluation set and both verified model files before activation.
import fs from "node:fs";
import path from "node:path";
import { at, readJSON, writeJSON, localOnly } from "./_trainingFiles.js";
import { capabilities } from "./_trainingRuntime.js";
import { forwardTraining } from "./_trainingProxy.js";

export function usableModel(model) {
  if (!model || !/^[\w-]+$/.test(model.version || "")) return false;
  const evaluation = model.evaluation;
  if (!evaluation || ![model.score, model.baselineScore].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) return false;
  const { trainNames, validationNames, trainGroups, validationGroups } = evaluation;
  if (![trainNames, validationNames, trainGroups, validationGroups].every(a => Array.isArray(a) && a.length)) return false;
  if (validationNames.some(n => trainNames.includes(n)) || validationGroups.some(n => trainGroups.includes(n))) return false;
  return ["weights", "onnx"].every(kind => {
    const expected = path.join("models", model.version, kind === "weights" ? "best.pt" : "best.onnx");
    return model.artifacts?.[kind] === expected && fs.existsSync(at(expected)) && fs.statSync(at(expected)).size > 0;
  });
}
export const modelRegistry = () => ({ active: null, candidate: null, previous: null, ...readJSON(at("models.json")) });

export default async function handler(req, res) {
  if (await forwardTraining(req, res)) return;
  const tools = await capabilities();
  const registry = modelRegistry();
  if (req.method === "GET") return res.json({ ...registry, capabilities: tools });
  if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST." });
  if (localOnly(res)) return;
  const { action, version } = req.body || {};
  if (action === "activate") {
    const candidate = registry.candidate;
    if (version && candidate?.version !== version) return res.status(409).json({ error: "The candidate changed. Reload model results before activating it." });
    if (!tools.available) return res.status(503).json({ error: tools.error });
    if (!usableModel(candidate)) return res.status(409).json({ error: "Train and evaluate a model on separate geographic areas, and finish its ONNX export before activation." });
    registry.previous = registry.active;
    registry.active = candidate;
    registry.candidate = null;
  } else if (action === "rollback") {
    if (!usableModel(registry.previous)) return res.status(409).json({ error: "No usable previous model is available." });
    [registry.active, registry.previous] = [registry.previous, registry.active];
  } else return res.status(400).json({ error: "Choose activate or rollback." });
  writeJSON(at("models.json"), registry);
  res.json({ ...registry, capabilities: tools });
}
