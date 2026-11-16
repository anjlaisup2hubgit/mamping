import assert from "node:assert/strict";
import test from "node:test";
import { modules } from "./helpers/modules.js";

test("all public API URLs dispatch through one function without changing the request", async () => {
  const names = ["analyze", "contribute", "contributions", "detect", "models", "outline", "ready", "roads", "scan", "train", "training", "training-image", "upload-token"];
  const mocks = Object.fromEntries(names.map(name => [new URL(`../api/_${name}.js`, import.meta.url).href, {
    default: (req, res) => { res.called = name; res.request = req; return name; }
  }]));
  const { exports } = await modules(new URL("../api/[route].js", import.meta.url), { globals: { URL }, mocks });
  for (const name of names) {
    const req = { url: `/api/${name}?x=12`, method: "POST", body: { example: true }, query: { x: "12" } };
    const res = {};
    assert.equal(exports.default(req, res), name);
    assert.equal(res.called, name);
    assert.equal(res.request, req);
  }
  for (const name of ["missing", "_models", "toString", "models/extra"]) {
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    exports.default({ url: `/api/${name}` }, res);
    assert.equal(res.code, 404);
  }
});
