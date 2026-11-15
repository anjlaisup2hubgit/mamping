import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SourceTextModule, SyntheticModule, createContext } from "node:vm";
import { mid } from "../src/data/geo.js";
import { validatePolygon } from "../src/data/geometry.js";
import { checkCancelled } from "../src/data/tasks.js";

const ORIGINAL = "original-satellite-jpeg";
const ENHANCED = "enhanced-satellite-jpeg";
const DETECTED = [{ points: [[0, 0], [768, 0], [768, 768]], confidence: 0.8 }];
const TRACED = [{ points: [[10, 20], [30, 20], [30, 40], [10, 40]], confidence: 0.8 }];
const plain = value => JSON.parse(JSON.stringify(value));

async function setup(overrides = {}) {
  const events = [], warnings = [], pixels = [];
  const toLatLng = (x, y) => {
    pixels.push([x, y]);
    return [70 - y / 100, 110 + x / 100];
  };
  const mocks = {
    "./satellite.js": {
      getSatelliteView: async (lat, lng) => {
        events.push(["satellite", lat, lng]);
        return { image: ORIGINAL, toLatLng };
      }
    },
    "./enhanceImage.js": {
      enhanceImage: overrides.enhanceImage || (async image => {
        events.push(["enhance:start", image]);
        await Promise.resolve();
        events.push(["enhance:done"]);
        return ENHANCED;
      })
    },
    "./finder.js": {
      findBuildings: overrides.findBuildings || (async image => {
        events.push(["detect", image]);
        return DETECTED;
      })
    },
    "./tracer.js": {
      outlineAll: overrides.outlineAll || (async (image, found) => {
        events.push(["outline", image, found]);
        return TRACED;
      })
    },
    "./geo.js": { mid },
    "./geometry.js": { validatePolygon },
    "./tasks.js": { checkCancelled },
    "./sam.js": { releaseSamImage: () => {} }
  };
  const context = createContext({ console: { warn: (...args) => warnings.push(args) } });
  const code = await readFile(new URL("../src/data/scanImage.js", import.meta.url), "utf8");
  const module = new SourceTextModule(code, { context });
  await module.link(specifier => {
    const exports = mocks[specifier];
    assert.ok(exports, `Unexpected scan dependency: ${specifier}`);
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return { scanImage: module.namespace.scanImage, events, warnings, pixels };
}

test("enhances before detection and uses the same enhanced picture for tracing", async () => {
  const { scanImage, events, warnings } = await setup();
  const result = await scanImage(20.8, 106.6, true);
  assert.deepEqual(plain(events), [
    ["satellite", 20.8, 106.6],
    ["enhance:start", ORIGINAL],
    ["enhance:done"],
    ["detect", ENHANCED],
    ["outline", ENHANCED, DETECTED]
  ]);
  assert.equal(result.fallback, false);
  assert.equal(warnings.length, 0);
});

test("keeps traced pixel coordinates unchanged when converting to map points", async () => {
  const { scanImage, pixels } = await setup();
  const { buildings } = await scanImage(20.8, 106.6, true);
  assert.deepEqual(pixels, TRACED[0].points);
  const coords = [[69.8, 110.1], [69.8, 110.3], [69.6, 110.3], [69.6, 110.1]];
  assert.deepEqual(plain(buildings), [{ coords, center: mid(coords), confidence: 0.8 }]);
});

test("disabled enhancement skips the model and scans the original picture", async () => {
  const { scanImage, events, warnings } = await setup({
    enhanceImage: () => assert.fail("The enhancement model must not load when disabled")
  });
  const result = await scanImage(20.8, 106.6, false);
  assert.deepEqual(plain(events), [
    ["satellite", 20.8, 106.6],
    ["detect", ORIGINAL],
    ["outline", ORIGINAL, DETECTED]
  ]);
  assert.equal(result.fallback, false);
  assert.equal(warnings.length, 0);
});

test("failed enhancement warns and falls back to the original for both AI steps", async () => {
  const failure = new Error("Model download unavailable");
  const { scanImage, events, warnings } = await setup({
    enhanceImage: async () => { throw failure; }
  });
  const result = await scanImage(20.8, 106.6, true);
  assert.equal(result.fallback, true);
  assert.deepEqual(plain(events), [
    ["satellite", 20.8, 106.6],
    ["detect", ORIGINAL],
    ["outline", ORIGINAL, DETECTED]
  ]);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes(failure));
});

test("detector failures propagate rather than pretending enhancement failed", async () => {
  const failure = new Error("AI quota exceeded");
  const { scanImage, warnings } = await setup({
    findBuildings: async () => { throw failure; },
    outlineAll: () => assert.fail("Tracing must not run after detection fails")
  });
  await assert.rejects(scanImage(20.8, 106.6, true), error => error === failure);
  assert.equal(warnings.length, 0);
});

test("tracer failures propagate rather than reporting a successful scan", async () => {
  const failure = new Error("Tracing failed");
  const { scanImage, warnings } = await setup({
    outlineAll: async () => { throw failure; }
  });
  await assert.rejects(scanImage(20.8, 106.6, true), error => error === failure);
  assert.equal(warnings.length, 0);
});
