import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createContext, SourceTextModule, SyntheticModule } from "node:vm";

const labels = "0 0.2 0.2 0.1 0.1\n0 0.7 0.7 0.1 0.1";
const one = "0 0.2 0.2 0.1 0.1";
const turn = () => new Promise(done => setImmediate(done));
async function setup(writeTraining, initial = {}, quota = false) {
  const stored = new Map(Object.entries(initial));
  const context = createContext({ localStorage: {
    getItem: k => stored.get(k) || null,
    setItem: (k, v) => { if (quota) throw new Error("Storage full"); stored.set(k, v); },
    removeItem: k => stored.delete(k)
  } });
  const module = new SourceTextModule(await readFile(new URL("../src/data/trainingDrafts.js", import.meta.url), "utf8"), { context });
  await module.link(() => new SyntheticModule(["writeTraining"], function () { this.setExport("writeTraining", writeTraining); }, { context }));
  await module.evaluate();
  return { trainingDraft: module.namespace.trainingDraft, stored };
}

test("a removed roof is saved immediately and confirmed before the browser draft is cleared", async () => {
  let finish;
  const requests = [];
  const { trainingDraft, stored } = await setup(body => { requests.push(body); return new Promise(done => { finish = done; }); });
  const p = { name: "scene", labels, status: "kept", revision: 3 };
  const draft = trainingDraft(p);
  draft.set(one);
  assert.equal(p.labels, one);
  assert.equal(p.status, "");
  assert.equal(JSON.parse(stored.get("training_draft:scene")).labels, one);
  assert.equal(requests[0].expectedRevision, 3);
  finish({ revision: 4, status: "" }); await draft.flush();
  assert.equal(p.revision, 4);
  assert.equal(draft.state().dirty, false);
  assert.equal(stored.has("training_draft:scene"), false);
});

test("edits during a save are serialized against the returned revision", async () => {
  const requests = [], finishes = [];
  const { trainingDraft } = await setup(body => { requests.push(body); return new Promise(done => finishes.push(done)); });
  const p = { name: "scene", labels, revision: 2 };
  const draft = trainingDraft(p);
  draft.set(one); draft.set("");
  assert.equal(requests.length, 1);
  finishes[0]({ revision: 3, status: "" }); await turn();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].expectedRevision, 3);
  assert.equal(requests[1].labels, "");
  finishes[1]({ revision: 4, status: "" }); await draft.flush();
  assert.equal(p.labels, ""); assert.equal(draft.state().dirty, false);
});

test("failed saving leaves a recoverable browser draft rather than losing removals on reopening", async () => {
  const { trainingDraft, stored } = await setup(async () => { throw new Error("Worker offline"); });
  const p = { name: "scene", labels, revision: 1 };
  const draft = trainingDraft(p); draft.set(one);
  await assert.rejects(draft.flush(), /Worker offline/);
  assert.equal(draft.state().local, true);
  assert.equal(draft.state().error, "Worker offline");
  const next = await setup(async () => ({ revision: 2, status: "" }), Object.fromEntries(stored));
  const reopened = { name: "scene", labels, revision: 1 };
  const recovered = next.trainingDraft(reopened);
  assert.equal(reopened.labels, one);
  await recovered.flush(); assert.equal(recovered.state().dirty, false);
});

test("storage failures and server failures remain explicitly unsaved", async () => {
  const { trainingDraft } = await setup(async () => { throw new Error("Offline"); }, {}, true);
  const draft = trainingDraft({ name: "scene", labels, revision: 1 }); draft.set(one);
  await assert.rejects(draft.flush(), /Offline/);
  assert.equal(draft.state().dirty, true); assert.equal(draft.state().local, false);
});

test("older browser labels do not silently overwrite a changed server picture", async () => {
  const requests = [];
  const { trainingDraft } = await setup(async body => { requests.push(body); return { revision: 5, status: "" }; }, {
    "training_draft:scene": JSON.stringify({ labels: one, baseRevision: 2 })
  });
  const p = { name: "scene", labels, revision: 4 };
  const draft = trainingDraft(p);
  assert.equal(p.labels, labels); assert.ok(draft.state().conflict); assert.equal(requests.length, 0);
  draft.recover(); await draft.flush();
  assert.equal(requests[0].expectedRevision, 4); assert.equal(p.labels, one);
});

test("keeping an empty scene waits for its label save and reviews the new revision", async () => {
  const requests = [];
  const { trainingDraft } = await setup(async body => {
    requests.push(body); return { revision: body.status === "draft" ? 2 : 2, status: body.status === "draft" ? "" : body.status };
  });
  const p = { name: "empty-scene", labels, revision: 1 };
  const draft = trainingDraft(p); draft.set(""); await draft.mark("kept");
  assert.deepEqual(requests.map(x => [x.status, x.expectedRevision, x.labels]), [["draft", 1, ""], ["kept", 2, ""]]);
  assert.equal(p.status, "kept");
});
