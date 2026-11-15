import assert from "node:assert/strict";
import test from "node:test";
import { polygonsOverlap, validatePolygon } from "../src/data/geometry.js";
import { validateBuildingTags } from "../src/data/buildingTags.js";

// Work in a small local patch, roughly ten metres for each unit.
const geo = points => points.map(([x, y]) => [20 + y * 0.0001, 106 + x * 0.0001]);
const rect = (x, y, w, h) => geo([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);

test("validates open or explicitly closed building rings", () => {
  const roof = rect(0, 0, 2, 1);
  assert.equal(validatePolygon(roof), null);
  assert.equal(validatePolygon([...roof, roof[0]]), null);
  assert.equal(validatePolygon([...roof].reverse()), null);
});

test("rejects broken, flat, repeated, out-of-range and crossed corners", () => {
  for (const invalid of [null, [], [[NaN, 106], [20, 106], [21, 106]],
    [[91, 106], [20, 106], [21, 106]], geo([[0, 0], [0, 0], [1, 1]]),
    geo([[0, 0], [1, 0], [2, 0]]), geo([[0, 0], [2, 2], [0, 2], [2, 0]])]) {
    assert.equal(typeof validatePolygon(invalid), "string");
  }
});

test("overlap catches crossing buildings even when no corner is inside", () => {
  assert.equal(polygonsOverlap(rect(-2, -0.5, 4, 1), rect(-0.5, -2, 1, 4)), true);
});

test("overlap catches containment and coincident outlines", () => {
  const outer = rect(0, 0, 4, 4), inner = rect(1, 1, 1, 1);
  assert.equal(polygonsOverlap(outer, inner), true);
  assert.equal(polygonsOverlap(inner, outer), true);
  assert.equal(polygonsOverlap(outer, outer), true);
  assert.equal(polygonsOverlap(outer, [...outer, outer[0]]), true);
});

test("nearby buildings can share a wall or corner without overlapping", () => {
  assert.equal(polygonsOverlap(rect(0, 0, 1, 1), rect(1, 0, 1, 1)), false);
  assert.equal(polygonsOverlap(rect(0, 0, 1, 1), rect(1, 1, 1, 1)), false);
  assert.equal(polygonsOverlap(rect(0, 0, 1, 1), rect(2, 0, 1, 1)), false);
});

test("pixel validation keeps image coordinates independent from geographic bounds", () => {
  const pixels = [[300, 300], [420, 300], [420, 410], [300, 410]];
  assert.equal(validatePolygon(pixels, { pixels: true }), null);
  assert.equal(typeof validatePolygon(pixels), "string");
});

test("unfinished details stay out of public map uploads", () => {
  assert.equal(validateBuildingTags({ height: 12.5, "building:levels": 4, "roof:colour": "#808080" }), null);
  for (const tags of [{ height: "Infinity" }, { height: "abc" }, { "building:levels": 1.5 }, { "roof:height": -2 }, { "roof:colour": "123" }]) {
    assert.equal(typeof validateBuildingTags(tags), "string");
  }
});
