import assert from "node:assert/strict";
import test from "node:test";
import { modules } from "./helpers/modules.js";

async function check({ ids = "42", authorization, method = "POST", route = "/api/train", user = 42 } = {}) {
  let fetches = 0, status = 200, result;
  const { exports } = await modules(new URL("../api/_trainingAccess.js", import.meta.url), {
    globals: { process: { env: { TRAINING_EDITOR_IDS: ids } }, URL, AbortSignal,
      fetch: async () => { fetches++; return { ok: true, json: async () => ({ user: { id: user } }) }; } }
  });
  const allowed = await exports.trainingWriteAllowed({ method, url: route, headers: { authorization } }, {
    status(code) { status = code; return this; }, json(value) { result = value; }
  });
  return { allowed, status, result, fetches };
}

test("training writes need a configured editor list and a verified matching account", async () => {
  assert.equal((await check({ ids: "" })).status, 503);
  assert.equal((await check()).status, 401);
  assert.equal((await check({ authorization: "Bearer test-token", user: 9 })).status, 403);
  assert.equal((await check({ authorization: "Bearer test-token" })).allowed, true);
});
test("ordinary scans and read-only model status do not require training administrator access", async () => {
  assert.equal((await check({ route: "/api/detect", ids: "" })).allowed, true);
  const read = await check({ method: "GET", ids: "" });
  assert.equal(read.allowed, true); assert.equal(read.fetches, 0);
});
