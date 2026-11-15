// Starts teaching the roof detector on your own computer (POST) and tells how far it is (GET). Never on the live site.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const STATE = path.join("training", "train.json");
const PYTHON = path.join(".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const failed = error => ({ state: "failed", error });

function readState() {
  let s;
  try { s = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return { state: "idle" }; }
  return s.state === "running" && !alive(s.pid) ? failed("Training stopped early. See training/train.log.") : s;
}

function start() {
  if (!fs.existsSync(PYTHON)) return failed("The training tools are not installed.");
  let status = {};
  try { status = JSON.parse(fs.readFileSync(path.join("training", "status.json"), "utf8")); } catch {}
  if (!Object.values(status).includes("kept")) return failed("Keep some pictures first.");
  const log = fs.openSync(path.join("training", "train.log"), "w");
  const child = spawn(PYTHON, ["train.py"], { detached: true, stdio: ["ignore", log, log] }); // keeps going even if this server restarts
  child.unref();
  const state = { state: "running", pid: child.pid, epoch: 0, epochs: 0 };
  fs.writeFileSync(STATE, JSON.stringify(state));
  return state;
}

export default async function handler(req, res) {
  if (process.env.VERCEL) return res.status(404).json({ error: "Only works on your own computer." });
  const now = readState();
  res.json(req.method === "POST" && now.state !== "running" ? start() : now);
}
