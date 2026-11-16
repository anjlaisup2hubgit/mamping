import assert from "node:assert/strict";
import test from "node:test";
import { snapToEdges } from "../src/data/edgeSnap.js";
import { metreFrame } from "../src/data/geo.js";

const centre = [20.8449, 106.6881], f = metreFrame(centre);
// A blurry photo: a bright 10 m × 6 m roof on dark ground, its edges smeared over about a metre, plus pixel noise.
const soft = v => 1 / (1 + Math.exp(-v / 0.25));
let seed = 1;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 30;
const photo = (lat, lng) => {
  const [x, y] = f.to([lat, lng]);
  const roof = soft(5 - Math.abs(x)) * soft(3 - Math.abs(y));
  return [40 + 160 * roof + noise(), 40 + 120 * roof + noise(), 40 + 100 * roof + noise()];
};
const outline = pts => pts.map(f.back);
const metres = coords => coords.map(p => f.to(p));

test("walls drawn off the roof slide onto its blurry edges", () => {
  const drawn = outline([[-4.4, -3.5], [5.6, -3.5], [5.6, 2.4], [-4.4, 2.4]]); // 0.6 m right, too low at the top
  const { coords, moved } = snapToEdges(drawn, photo);
  assert.equal(moved, 4);
  metres(coords).forEach((p, i) => {
    const want = [[-5, -3], [5, -3], [5, 3], [-5, 3]][i];
    assert.ok(Math.hypot(p[0] - want[0], p[1] - want[1]) < 0.15, `corner ${i} at ${p.map(v => v.toFixed(2))}`);
  });
});

test("an outline already on the edges stays put", () => {
  const drawn = outline([[-5, -3], [5, -3], [5, 3], [-5, 3]]);
  const { coords } = snapToEdges(drawn, photo);
  metres(coords).forEach((p, i) => {
    const want = [[-5, -3], [5, -3], [5, 3], [-5, 3]][i];
    assert.ok(Math.hypot(p[0] - want[0], p[1] - want[1]) < 0.1);
  });
});

test("a plain photo with no edges leaves the outline alone", () => {
  const drawn = outline([[-4, -2], [4, -2], [4, 2], [-4, 2]]);
  const { coords, moved } = snapToEdges(drawn, () => [90, 90, 90]);
  assert.equal(moved, 0);
  assert.deepEqual(coords.map(p => p.map(v => +v.toFixed(9))), drawn.map(p => p.map(v => +v.toFixed(9))));
});
