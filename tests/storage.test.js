import assert from "node:assert/strict";
import test from "node:test";
import { modules } from "./helpers/modules.js";

const url = name => new URL(`../src/data/${name}.js`, import.meta.url).href;
const job = { kind: "create", items: [{ corners: [[20, 106], [20, 106.001], [20.001, 106.001]], tags: { name: "Draft" } }], comment: "Test edit" };
const plain = value => JSON.parse(JSON.stringify(value));
async function setup(entry = "osmSend") {
  const data = new Map(), network = { onLine: false }, state = { account: "1", writesFail: false, calls: 0, failure: null };
  const storage = { getItem: k => data.get(k) ?? null, removeItem: k => data.delete(k), setItem: (k, v) => {
    if (state.writesFail) throw new Error("Quota exceeded"); data.set(k, v);
  } };
  const real = await modules(new URL(url(entry)), {
    globals: { localStorage: storage, navigator: network, addEventListener() {}, dispatchEvent() {} },
    mocks: {
      [url("osmAuth")]: { isLoggedIn: () => !!state.account, accountName: async () => "Mapper", getToken: () => "test-token", accountStorageId: () => state.account },
      [url("osmEdit")]: {
        createBuildings: async () => { state.calls++; if (state.failure) throw state.failure; return { ways: [{ id: 10, nodes: [] }], cs: 1 }; },
        addMissingTags: async () => ({ added: {}, cs: 1 })
      },
      [url("api")]: { putScan: async () => { if (state.failure) throw state.failure; }, getScan: async () => [] }
    }
  });
  return { api: real.exports, state, network, data };
}

test("an edit is reported queued only after verified durable storage", async () => {
  const { api, state, data } = await setup();
  state.writesFail = true;
  await assert.rejects(api.sendOrQueue(job), /could not save/);
  assert.equal(data.size, 0);
  assert.equal(state.calls, 0);
});

for (const status of [401, 409, 500]) test(`HTTP ${status} retains the failed edit until explicit retry`, async () => {
  const { api, state, network } = await setup();
  assert.equal((await api.sendOrQueue(job)).queued, true);
  network.onLine = true; state.failure = new Error(`OpenStreetMap said ${status}`);
  assert.equal((await api.flushQueue()).failed, 1);
  assert.equal(api.getQueue().length, 1);
  assert.equal(api.getQueue()[0].queue.state, "failed");
  await api.flushQueue(); assert.equal(state.calls, 1, "A rejected edit is not retried automatically");
  const id = api.getQueue()[0].queue.id;
  state.failure = null;
  assert.equal((await api.retryQueued(id)).sent, 1);
  assert.equal(api.getQueue().length, 0);
});

test("a lost response remains uncertain instead of risking a duplicate automatic upload", async () => {
  const { api, state, network } = await setup();
  await api.sendOrQueue(job);
  state.failure = new TypeError("Connection lost after upload"); network.onLine = true;
  await api.flushQueue();
  assert.equal(api.getQueue()[0].queue.state, "uncertain");
  await api.flushQueue(); assert.equal(state.calls, 1);
});

test("switching accounts never exposes or sends the previous account's queue", async () => {
  const { api, state, network } = await setup();
  await api.sendOrQueue(job);
  state.account = "2"; network.onLine = true;
  assert.equal(api.getQueue().length, 0); await api.flushQueue(); assert.equal(state.calls, 0);
  state.account = "1"; assert.equal(api.getQueue().length, 1);
});

test("draft names, review state and per-building undo survive a device save", async () => {
  const { api, state, data } = await setup("savedScan");
  state.account = null;
  const draft = { id: "roof", coords: job.items[0].corners, center: [20, 106], keep: true, reviewed: true,
    tags: { name: "Saved house", height: "9.6" }, shapePast: [job.items[0].corners], shapeFuture: [] };
  await api.saveScan([draft]);
  assert.deepEqual(plain(await api.loadScan()), [draft]);
  assert.ok(data.has("missing_scan:guest"));
  state.writesFail = true;
  await assert.rejects(api.saveScan([]), /could not save/);
  state.writesFail = false;
  assert.equal((await api.loadScan()).length, 1, "A failed overwrite leaves the previous durable save intact");
});
