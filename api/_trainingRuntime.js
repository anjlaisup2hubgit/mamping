// Checks the workstation tools without importing the large models into the web server.
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
let cached = null, checked = 0;

export const pythonPath = () => process.env.TRAINING_PYTHON || path.resolve(".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
export async function capabilities() {
  if (process.env.VERCEL) return { available: false, localOnly: true, missing: ["A persistent local training worker"], error: "Training cannot run inside a short-lived hosted function. Run this app on your training workstation." };
  const python = pythonPath();
  if (!fs.existsSync(python)) return { available: false, localOnly: true, missing: ["Python training environment"], error: "Training tools are not installed. Follow docs/training.md to create .venv." };
  const key = python + fs.statSync(python).mtimeMs;
  if (cached?.key === key && Date.now() - checked < 30000) return cached.value;
  try {
    const { stdout } = await run(python, ["-c", "import importlib.util,json; print(json.dumps([x for x in ['torch','ultralytics','onnx','onnxruntime'] if importlib.util.find_spec(x) is None]))"], { timeout: 10000 });
    const missing = JSON.parse(stdout.trim());
    const value = { available: !missing.length, localOnly: true, missing, ...(missing.length ? { error: `Install training packages from requirements-training.txt: ${missing.join(", ")}.` } : {}) };
    cached = { key, value }; checked = Date.now(); return value;
  } catch { return { available: false, localOnly: true, missing: ["Working Python training environment"], error: "Python could not check the training tools. Follow docs/training.md." }; }
}
