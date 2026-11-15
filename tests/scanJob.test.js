import assert from "node:assert/strict";
import test from "node:test";
import { modules } from "./helpers/modules.js";

const picture = i => ({ centre: [20 + i, 106], nw: [21 + i, 105], se: [19 + i, 107] });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
async function setup() {
  const { exports } = await modules(new URL("../src/data/scanJob.js", import.meta.url), {
    globals: { AbortController, DOMException },
    mocks: { [new URL("../src/data/scanImage.js", import.meta.url).href]: { scanImage() { throw new Error("A test must supply its scanner"); } } }
  });
  return exports.runScanJob;
}

test("a job freezes its area and streams finished pictures while another is still running", async () => {
  const run = await setup(), held = deferred(), delivered = deferred(), selected = [picture(0), picture(1)];
  const results = [];
  const job = run(selected, { scanPicture: async lat => {
    if (lat === 20) await held.promise;
    return { buildings: [{ lat }], fallback: false };
  }, onResult: (buildings, tile) => { results.push({ lat: tile.centre[0], buildings }); delivered.resolve(); } });
  selected[0].centre[0] = 99;
  await delivered.promise;
  assert.equal(results[0].lat, 21);
  held.resolve();
  const finished = await job;
  assert.equal(finished.completed, 2);
  assert.equal(results[1].lat, 20, "Changing a picker cannot change a running job");
});

test("cancelling stops waiting, preserves completed results, and lists unfinished pictures for retry", async () => {
  const run = await setup(), controller = new AbortController(), delivered = deferred();
  const results = [];
  const job = run([picture(0), picture(1), picture(2)], { signal: controller.signal, scanPicture: async lat => {
    if (lat !== 20) return new Promise(() => {});
    return { buildings: ["finished roof"], fallback: false };
  }, onResult: buildings => { results.push(...buildings); delivered.resolve(); } });
  await delivered.promise;
  await new Promise(done => setImmediate(done));
  controller.abort();
  const finished = await job;
  assert.equal(finished.cancelled, true);
  assert.equal(finished.completed, 1);
  assert.equal(finished.unfinished.length, 2);
  assert.deepEqual(results, ["finished roof"]);
});

test("one failed picture does not discard results from the remaining pictures", async () => {
  const run = await setup(), result = [];
  const finished = await run([picture(0), picture(1)], { scanPicture: async lat => {
    if (lat === 20) throw new Error("Quota exceeded");
    return { buildings: ["usable roof"], fallback: true };
  }, onResult: buildings => result.push(...buildings) });
  assert.equal(finished.failed.length, 1);
  assert.equal(finished.fallback, 1);
  assert.equal(finished.completed, 2);
  assert.deepEqual(result, ["usable roof"]);
});
