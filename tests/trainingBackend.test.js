import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { modules } from "./helpers/modules.js";

async function setup(t, entry, available = true) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "mamping-api-test-"));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));
  const { exports } = await modules(new URL(`../api/_${entry}.js`, import.meta.url), {
    globals: { process: { env: { TRAINING_DATA_DIR: folder }, pid: process.pid }, Buffer, URL, AbortController },
    mocks: { [new URL("../api/_trainingRuntime.js", import.meta.url).href]: {
      capabilities: async () => ({ available, localOnly: true, missing: available ? [] : ["Python training packages"], error: available ? undefined : "Install the training tools." }),
      pythonPath: () => process.execPath
    } }
  });
  const call = async (method, body, query = {}) => {
    const result = { status: 200, body: null };
    const res = { status(code) { result.status = code; return this; }, json(body) { result.body = body; }, setHeader() {} };
    await exports.default({ method, body, query }, res);
    return result;
  };
  return { call, folder, exports };
}
const jpeg = Buffer.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]).toString("base64");

test("changed labels reset review and stale writes cannot overwrite a newer revision", async t => {
  const { call } = await setup(t, "training");
  const sample = { name: "roof-scene", image: jpeg, labels: "0 0.5 0.5 0.2 0.2", centre: [20, 106] };
  let response = await call("POST", sample);
  assert.equal(response.body.revision, 1);
  response = await call("POST", { name: sample.name, status: "kept", expectedRevision: 1 });
  assert.equal(response.body.status, "kept");
  response = await call("POST", { name: sample.name, labels: "", expectedRevision: 1 });
  assert.equal(response.body.revision, 2);
  assert.equal(response.body.status, "");
  assert.equal((await call("POST", { name: sample.name, labels: sample.labels, expectedRevision: 1 })).status, 409);
  const listed = (await call("GET")).body;
  assert.equal(listed[0].labels, "");
  assert.equal(listed[0].reviewedRevision, null);
  assert.equal((await call("POST", { name: sample.name, status: "kept", expectedRevision: 2 })).body.status, "kept");
});

test("invalid boxes and paths are rejected without creating dataset files", async t => {
  const { call, folder } = await setup(t, "training");
  assert.equal((await call("POST", { name: "../escape", image: jpeg, labels: "" })).status, 400);
  assert.equal((await call("POST", { name: "roof", image: jpeg, labels: "0 0.95 0.95 0.5 0.5" })).status, 400);
  assert.deepEqual(await fs.readdir(folder), []);
});

test("a missing runtime failure remains visible on the next poll", async t => {
  const { call } = await setup(t, "train", false);
  assert.equal((await call("POST", {})).body.state, "failed");
  const later = await call("GET");
  assert.equal(later.body.state, "failed");
  assert.match(later.body.error, /training tools/);
});

test("activation requires separate geographic evaluation and supports rollback", async t => {
  const { call, folder } = await setup(t, "models");
  const candidate = async version => {
    const dir = path.join(folder, "models", version);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "best.pt"), "fixture weights");
    await fs.writeFile(path.join(dir, "best.onnx"), "fixture ONNX; actual export is tested separately");
    return { version, score: .6, baselineScore: .5, artifacts: { weights: `models/${version}/best.pt`, onnx: `models/${version}/best.onnx` },
      evaluation: { trainNames: ["area-a"], validationNames: ["area-b"], trainGroups: ["20:106"], validationGroups: ["21:106"] } };
  };
  const first = await candidate("first");
  await fs.writeFile(path.join(folder, "models.json"), JSON.stringify({ candidate: { ...first, evaluation: { ...first.evaluation, validationGroups: first.evaluation.trainGroups } } }));
  assert.equal((await call("POST", { action: "activate", version: "first" })).status, 409);
  await fs.writeFile(path.join(folder, "models.json"), JSON.stringify({ candidate: first }));
  assert.equal((await call("POST", { action: "activate", version: "first" })).body.active.version, "first");
  const second = await candidate("second");
  await fs.writeFile(path.join(folder, "models.json"), JSON.stringify({ active: first, candidate: second }));
  assert.equal((await call("POST", { action: "activate", version: "first" })).status, 409);
  assert.equal((await call("POST", { action: "activate", version: "second" })).body.active.version, "second");
  assert.equal((await call("POST", { action: "rollback" })).body.active.version, "first");
});
