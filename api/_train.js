// Starts a durable local training process and preserves failures until the next attempt.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { at, readJSON, writeJSON } from "./_trainingFiles.js";
import { pythonPath, capabilities } from "./_trainingRuntime.js";
import { forwardTraining } from "./_trainingProxy.js";

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
function state() {
  const now = readJSON(at("train.json"), { state: "idle" });
  if (now.state === "running" && !alive(now.pid)) {
    const failed = { ...now, state: "failed", error: "Training stopped early. See training/train.log.", finishedAt: new Date().toISOString() };
    writeJSON(at("train.json"), failed); return failed;
  }
  return now;
}
function fail(error) {
  const value = { state: "failed", error, finishedAt: new Date().toISOString() };
  writeJSON(at("train.json"), value); return value;
}
function start() {
  if (state().state === "running") return state();
  const status = readJSON(at("status.json"));
  if (Object.values(status).filter(s => s === "kept").length < 2) return fail("Keep complete pictures from at least two separate geographic areas before training.");
  fs.mkdirSync(at(), { recursive: true });
  let lock;
  try { lock = fs.openSync(at("train.lock"), "wx"); }
  catch {
    const old = state();
    if (old.state === "running") return old;
    fs.rmSync(at("train.lock"), { force: true });
    lock = fs.openSync(at("train.lock"), "wx");
  }
  const log = fs.openSync(at("train.log"), "w");
  const child = spawn(pythonPath(), ["train.py"], { detached: true, stdio: ["ignore", log, log], env: { ...process.env, YOLO_AUTOINSTALL: "False" } });
  fs.closeSync(log); fs.closeSync(lock);
  const running = { state: "running", pid: child.pid, epoch: 0, epochs: 50, startedAt: new Date().toISOString() };
  writeJSON(at("train.json"), running);
  child.once("error", error => { fail("Could not start training: " + error.message); fs.rmSync(at("train.lock"), { force: true }); });
  child.once("exit", code => {
    if (code && state().state === "running") fail(`Training exited with code ${code}. See training/train.log.`);
    fs.rmSync(at("train.lock"), { force: true });
  });
  child.unref(); return running;
}
export default async function handler(req, res) {
  if (await forwardTraining(req, res)) return;
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Use GET or POST." });
  const tools = await capabilities();
  let current = state();
  if (req.method === "POST" && current.state !== "running") current = tools.available ? start() : process.env.VERCEL ? { state: "failed", error: tools.error } : fail(tools.error);
  res.json({ ...current, capabilities: tools });
}
