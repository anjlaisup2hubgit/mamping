import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SourceTextModule, SyntheticModule, createContext } from "node:vm";

async function gemini(fetch, extra = {}) {
  const context = createContext({ fetch, process: { env: {} }, AbortSignal,
    setTimeout: (f, ms) => setTimeout(f, Math.min(ms, 1)), clearTimeout, ...extra });
  const code = await readFile(new URL("../api/_claude.js", import.meta.url), "utf8");
  const module = new SourceTextModule(code, { context });
  await module.link(() => assert.fail("Unexpected Gemini dependency"));
  await module.evaluate();
  return module.namespace;
}

const goodReply = buildings => ({ ok: true, json: async () => ({ candidates: [{ content: {
  parts: [{ text: JSON.stringify({ buildings }) }]
} }] }) });
const roof = { points: [[10, 20], [30, 20], [30, 40], [10, 40]], confidence: 0.8 };

test("missing credentials produce an actionable code without contacting Gemini", async () => {
  const { askJSON } = await gemini(() => assert.fail("No unauthenticated model request"));
  await assert.rejects(askJSON(["picture"], "Find roofs"), e =>
    e.status === 503 && e.code === "MISSING_KEY" && e.message.includes("Scan options"));
});

for (const [upstream, status, code] of [[401, 401, "KEY_REFUSED"], [403, 401, "KEY_REFUSED"],
  [429, 429, "QUOTA_EXHAUSTED"], [404, 404, "MODEL_UNAVAILABLE"], [503, 503, "AI_BUSY"]]) {
  test(`Gemini ${upstream} retains the correct recovery code`, async () => {
    let calls = 0;
    const { askJSON } = await gemini(async (url, options) => {
      calls++;
      assert.ok(options.signal);
      return { ok: false, status: upstream, text: () => assert.fail("Do not expose upstream bodies") };
    });
    await assert.rejects(askJSON(["picture"], "Find roofs", 1200, "test-only-key"), e => e.status === status && e.code === code);
    assert.equal(calls, upstream === 503 ? 3 : 1);
  });
}

test("network and malformed replies have separate actionable errors", async () => {
  const network = await gemini(async () => { throw new TypeError("Private connection details"); });
  await assert.rejects(network.askJSON(["picture"], "Find", 1200, "test-only-key"), e =>
    e.status === 502 && e.code === "AI_CONNECTION" && !e.message.includes("Private"));
  for (const data of [null, {}, { candidates: [{ content: { parts: "bad" } }] },
    { candidates: [{ content: { parts: [{ text: "{broken" }] } }] }]) {
    const malformed = await gemini(async () => ({ ok: true, json: async () => data }));
    await assert.rejects(malformed.askJSON(["picture"], "Find", 1200, "test-only-key"), e => e.status === 502 && e.code === "INVALID_AI_RESPONSE");
  }
});

test("Google's invalid-key 400 response also tells the user to check their key", async () => {
  const { askJSON } = await gemini(async () => ({ ok: false, status: 400,
    json: async () => ({ error: { details: [{ reason: "API_KEY_INVALID" }] } })
  }));
  await assert.rejects(askJSON(["picture"], "Find", 1200, "test-only-key"), e => e.status === 401 && e.code === "KEY_REFUSED");
});

test("successful replies stay compatible with the existing image API", async () => {
  let sent;
  const { askJSON, okImages } = await gemini(async (url, options) => { sent = JSON.parse(options.body); return goodReply([roof]); });
  const reply = await askJSON(["picture"], "Find", 1200, "test-only-key");
  assert.deepEqual(JSON.parse(JSON.stringify(reply)), { buildings: [roof] });
  assert.equal(sent.contents[0].parts[0].inline_data.data, "picture");
  assert.equal(okImages([""]), false);
  assert.equal(okImages(["picture"]), true);
});

test("cancelled and timed-out requests are distinguished", async () => {
  const user = new AbortController();
  user.abort();
  const cancelled = await gemini(async (url, options) => { options.signal.throwIfAborted(); });
  await assert.rejects(cancelled.askJSON(["picture"], "Find", 1200, "test-only-key", user.signal), e => e.code === "CANCELLED" && e.status === 499);
  const deadline = new AbortController();
  const timed = await gemini(async () => { deadline.abort(); throw deadline.signal.reason; }, {
    AbortSignal: { timeout: () => deadline.signal, any: signals => AbortSignal.any(signals) }
  });
  await assert.rejects(timed.askJSON(["picture"], "Find", 1200, "test-only-key"), e => e.code === "AI_TIMEOUT" && e.status === 504);
});

async function outline(askJSON, body = { image: "picture" }, hooks = {}) {
  const context = createContext({ AbortController, AbortSignal });
  const code = await readFile(new URL("../api/outline.js", import.meta.url), "utf8");
  const module = new SourceTextModule(code, { context });
  await module.link(() => new SyntheticModule(["askJSON", "okImages"], function () {
    this.setExport("askJSON", askJSON);
    this.setExport("okImages", images => images.every(s => typeof s === "string" && s.length));
  }, { context }));
  await module.evaluate();
  const response = { statusCode: 200, body: null, ...hooks,
    status(n) { this.statusCode = n; return this; },
    json(b) { this.body = JSON.parse(JSON.stringify(b)); return this; }
  };
  await module.namespace.default({ method: "POST", headers: {}, body }, response);
  return response;
}

test("outline preserves model errors instead of replacing all of them with 500", async () => {
  const response = await outline(async () => { throw Object.assign(new Error("Quota used up"), { status: 429, code: "QUOTA_EXHAUSTED" }); });
  assert.equal(response.statusCode, 429);
  assert.deepEqual(response.body, { error: "Quota used up", code: "QUOTA_EXHAUSTED" });
});

test("disconnecting the browser cancels the upstream scan and removes its listener", async () => {
  const listeners = new Map();
  const response = await outline(async (...args) => {
    const signal = args[4];
    assert.equal(signal.aborted, false);
    listeners.get("close")();
    assert.equal(signal.aborted, true);
    throw Object.assign(new Error("Scan cancelled."), { status: 499, code: "CANCELLED" });
  }, { image: "picture" }, {
    on: (type, callback) => listeners.set(type, callback),
    off: (type, callback) => { assert.equal(listeners.get(type), callback); listeners.delete(type); }
  });
  assert.equal(response.statusCode, 499);
  assert.equal(listeners.size, 0);
});

test("one malformed roof does not remove the valid roofs", async () => {
  const bad = [null, { ...roof, confidence: 2 }, { ...roof, points: [[0, 0], [1, 1], [2, 2]] },
    { ...roof, points: [[10, 20], [800, 20], [30, 40]] },
    { ...roof, points: [[10, 20], [Infinity, 20], [30, 40]] }, { ...roof, points: [[1, 2]] }];
  const response = await outline(async () => ({ buildings: [roof, ...bad] }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { buildings: [roof], discarded: bad.length });
});

test("missing lists and wholly malformed model results fail clearly, while an empty list is valid", async () => {
  for (const result of [{}, { buildings: "bad" }, { buildings: [{ points: [], confidence: 0 }] }]) {
    const response = await outline(async () => result);
    assert.equal(response.statusCode, 502);
    assert.equal(response.body.code, "INVALID_AI_RESPONSE");
  }
  assert.deepEqual((await outline(async () => ({ buildings: [] }))).body, { buildings: [], discarded: 0 });
});
