import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("a hosted app forwards only server-authenticated requests to its persistent worker", async t => {
  const data = await mkdtemp(path.join(os.tmpdir(), "mamping-worker-test-"));
  const token = randomBytes(32).toString("hex");
  const env = { ...process.env, TRAINING_DATA_DIR: data, TRAINING_WORKER_TOKEN: token, TRAINING_PYTHON: path.join(data, "missing-python") };
  delete env.TRAINING_WORKER_URL; delete env.VERCEL;
  const worker = spawn(process.execPath, ["worker-server.js"], { env: { ...env, PORT: "0" }, stdio: ["ignore", "pipe", "pipe"] });
  t.after(async () => { worker.kill(); await rm(data, { recursive: true, force: true }); });
  const line = await new Promise((resolve, reject) => { worker.stdout.once("data", c => resolve(String(c))); worker.once("error", reject); worker.once("exit", code => reject(new Error(`Worker exited: ${code}`))); });
  const port = Number(line.match(/port (\d+)/)?.[1]);
  assert.ok(port, "Worker reports its actual local listening port without exposing its token");
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/models`)).status, 401);
  const { forwardTraining } = await import("../api/_trainingProxy.js");
  const old = { url: process.env.TRAINING_WORKER_URL, token: process.env.TRAINING_WORKER_TOKEN };
  process.env.TRAINING_WORKER_URL = `http://127.0.0.1:${port}`; process.env.TRAINING_WORKER_TOKEN = token;
  t.after(() => {
    for (const [name, value] of [["TRAINING_WORKER_URL", old.url], ["TRAINING_WORKER_TOKEN", old.token]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  const result = { status: 200, headers: {}, body: null };
  const req = { url: "/api/models", method: "GET", once() {}, removeListener() {} };
  const res = { status(code) { result.status = code; return this; }, setHeader(k, v) { result.headers[k] = v; }, once() {}, end(value) { result.body = JSON.parse(String(value)); this.writableEnded = true; } };
  assert.equal(await forwardTraining(req, res), true);
  assert.equal(result.status, 200);
  assert.equal(result.body.capabilities.workerConnected, true);
  assert.equal(result.body.capabilities.available, false);
  assert.equal(result.body.active, null);
  worker.kill(); await once(worker, "exit");
});
