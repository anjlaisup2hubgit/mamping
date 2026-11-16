// Runs the active, exported roof model on the local training workstation.
import { spawn } from "node:child_process";
import { at, localOnly } from "./_trainingFiles.js";
import { pythonPath, capabilities } from "./_trainingRuntime.js";
import { modelRegistry, usableModel } from "./_models.js";
import { forwardTraining } from "./_trainingProxy.js";

let line = Promise.resolve();
function infer(image, model, req, res) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath(), ["detect.py", at(model.artifacts.onnx)], { stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, YOLO_AUTOINSTALL: "False" } });
    let output = "", error = "", settled = false;
    const finish = (failure, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      failure ? reject(failure) : resolve(value);
    };
    const timer = setTimeout(() => { child.kill(); finish(new Error("The trained model took too long. Try a smaller area.")); }, 60000);
    child.stdout.on("data", chunk => { output += chunk; if (output.length > 1e6) { child.kill(); finish(new Error("The detector returned too much data.")); } });
    child.stderr.on("data", chunk => { error = (error + chunk).slice(-2000); });
    child.once("error", e => finish(e));
    child.once("close", code => {
      if (code !== 0) return finish(new Error(error.trim() || "The trained detector stopped early."));
      try { finish(null, JSON.parse(output)); } catch { finish(new Error("The trained detector did not return a usable result.")); }
    });
    req.once?.("aborted", () => { child.kill(); finish(new Error("Scan cancelled.")); });
    res.once?.("close", () => { if (!res.writableEnded) { child.kill(); finish(new Error("Scan cancelled.")); } });
    child.stdin.on("error", e => finish(e));
    child.stdin.end(JSON.stringify({ image }));
  });
}
export default async function handler(req, res) {
  if (await forwardTraining(req, res)) return;
  if (localOnly(res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const { image } = req.body || {};
  if (typeof image !== "string" || image.length > 4e6 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return res.status(400).json({ error: "Bad satellite picture." });
  const tools = await capabilities();
  if (!tools.available) return res.status(503).json({ error: tools.error, code: "TRAINING_TOOLS_MISSING" });
  const model = modelRegistry().active;
  if (!usableModel(model)) return res.status(409).json({ error: "Activate an evaluated model on the Training page first.", code: "NO_ACTIVE_MODEL" });
  const next = line.then(() => infer(image, model, req, res));
  line = next.catch(() => {});
  try {
    const result = await next;
    if (!res.writableEnded) res.json({ ...result, model: { version: model.version, score: model.score } });
  } catch (e) { if (!res.writableEnded) res.status(503).json({ error: e.message, code: "TRAINED_DETECTOR_FAILED" }); }
}

