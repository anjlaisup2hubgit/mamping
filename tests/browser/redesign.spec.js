import { test, expect } from "@playwright/test";
import { setup } from "./fixtures.js";

test.use({ launchOptions: {
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--enable-unsafe-swiftshader"]
} });

// Service fixtures exercise real map, storage, recording and review code without publishing edits.
const buildings = [0, 1].flatMap(i => {
  const lat = 20.8449, lon = 106.6881 + i * .0004, start = i * 10;
  const nodes = [[lat, lon], [lat, lon + .0002], [lat - .00015, lon + .0002], [lat - .00015, lon]]
    .map(([lat, lon], n) => ({ type: "node", id: start + n + 1, lat, lon }));
  return [...nodes, { type: "way", id: 100 + i, nodes: [...nodes.map(n => n.id), nodes[0].id], tags: { building: "yes", name: `Test house ${i + 1}`, ...(i ? { height: "12", "building:levels": "3" } : {}) } }];
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 390, height: 568 }, { width: 390, height: 400 }]) {
  test(`explore controls, live counts and navigation at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = await setup(page, { osmElements: buildings });
    await expect(page.locator("#buildingCount")).toHaveText("2");
    await expect(page.locator("#needsCount")).toHaveText("1");
    await expect(page.locator("#q")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (viewport.width < 900) {
      await page.locator("#panelToggle").click();
      await expect(page.locator("#panelToggle")).toHaveAttribute("aria-expanded", "false");
      await expect(page.locator("#navCam")).toBeHidden();
      await expect(page.locator("#q")).toBeVisible();
      await page.locator("#panelToggle").click();
      await expect(page.locator("#navCam")).toBeVisible();
    }
    await page.locator('[data-base="satellite"]').click();
    await expect(page.locator('[data-base="satellite"]')).toHaveAttribute("aria-pressed", "true");
    await page.locator('[data-base="street"]').click();
    await page.locator("#layersB").click();
    await expect(page.locator("#bsheet")).toBeVisible();
    await page.getByRole("button", { name: "Close panel", exact: true }).click();
    await page.route("https://photon.komoot.io/api/?*", route => route.fulfill({ json: { features: [{ properties: { name: "Hai Phong", country: "Vietnam" }, geometry: { coordinates: [106.6881, 20.8449] } }] } }));
    await page.locator("#q").fill("Hai Phong");
    await page.locator("#results button").first().click();
    await expect(page.locator("#q")).toHaveValue("Hai Phong");
    if (viewport.height >= 800) await page.screenshot({ path: `test-results/explore-${viewport.width}.png` });
    await page.locator("#settingsB").click();
    await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
    await page.locator('[data-to="scanSettings"]').click();
    await page.locator('[data-set="outline"][data-val="roof"]').click();
    await expect(page.locator('[data-set="outline"][data-val="roof"]')).toHaveClass("on");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "My edits" }).click();
    await expect(page.locator(".contributionSummary strong")).toHaveText(["0", "0", "0"]);
    await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Guide" }).click();
    await expect(page.locator(".guideStep")).toHaveCount(3);
    await page.locator("#outlineGuide").click();
    await expect(page.locator(".scroll img")).toHaveCount(2);
    expect(await page.locator(".scroll img").evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("video filters use device recordings and keep shared neighbours out", async ({ page }) => {
  const errors = await setup(page);
  await page.evaluate(async () => {
    const { openStore, saveClip } = await import("/src/data/store.js");
    await openStore();
    for (const c of [{ id: 1, blob: new Blob(["fixture"]), sent: false }, { id: 2, videoDeleted: true, sent: true }, { id: 3, videoDeleted: true, sent: false }]) {
      await saveClip({ ...c, name: `Recording ${c.id}`, secs: 10, at: "Test date", track: [] });
    }
    const { state } = await import("/src/data/state.js");
    state.shared = [{ id: 99, name: "Neighbour recording", videoDeleted: true }];
    await (await import("/src/components/router.js")).go("videos");
  });
  await expect(page.locator("#list .item")).toHaveCount(3);
  await page.locator('[data-filter="waiting"]').click();
  await expect(page.locator("#list .item")).toHaveCount(1);
  await expect(page.locator("#list")).toContainText("Recording 1");
  await page.locator('[data-filter="shared"]').click();
  await expect(page.locator("#list")).toContainText("Recording 2");
  await page.locator('[data-filter="private"]').click();
  await expect(page.locator("#list .item")).toHaveCount(2);
  await expect(page.locator("#list")).not.toContainText("Neighbour");
  expect(errors).toEqual([]);
});

test("location control centres the map and building details show real facts", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 20.8449, longitude: 106.6881, accuracy: 5 });
  const errors = await setup(page, { osmElements: buildings });
  await expect(page.locator("#buildingCount")).toHaveText("2");
  await expect.poll(() => page.evaluate(async () => !!(await import("/src/data/state.js")).state.me)).toBe(true);
  await page.locator("#locateMe").click();
  await expect.poll(() => page.evaluate(async () => (await import("/src/components/mapView.js")).map.getZoom())).toBe(18);
  await page.evaluate(async () => (await import("/src/components/buildingSheet.js")).showBuilding(101));
  await expect(page.locator("#bh")).toHaveValue("12");
  await expect(page.locator("#bf")).toHaveValue("3");
  await expect(page.locator(".buildingPreview svg")).toBeVisible();
  await expect(page.locator("#captureDetails")).toBeVisible();
  await page.keyboard.press("Escape"); // the panel has no close button; a map tap or Esc closes it
  await expect(page.locator("#bsheet")).toBeHidden();
  expect(errors).toEqual([]);
});

test.describe("capture and review", () => {
  test("records privately, analyzes, previews edited details and keeps them offline", async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await context.grantPermissions(["camera", "microphone", "geolocation"]);
    await context.setGeolocation({ latitude: 20.8449, longitude: 106.6881, accuracy: 5 });
    const errors = await setup(page, { osmElements: buildings });
    await page.route("**/api/analyze", route => route.fulfill({ json: { buildingId: 100, name: "Suggested house", heightM: 9.6, floors: 3, confidence: .9 } }));
    await page.locator("#navCam").click();
    await page.locator("#tipsOk").click();
    await expect(page.locator("#page")).toHaveClass(/recording/);
    await expect(page.locator("#tm")).not.toHaveText("0:00");
    await page.screenshot({ path: "test-results/capture-phone.png" });
    await page.locator("#recBtn").click();
    await expect(page.getByRole("heading", { name: "Your video is saved", exact: true })).toBeVisible();
    await page.screenshot({ path: "test-results/saved-phone.png" });
    await page.locator("#toScan").click();
    await expect(page.getByRole("heading", { name: "Review building details", exact: true })).toBeVisible({ timeout: 15000 });
    await page.locator("#rn").fill("Checked house");
    await page.locator("#rf").fill("4");
    await expect(page.locator("#p3d svg")).toBeVisible();
    await page.screenshot({ path: "test-results/review-phone.png" });
    await page.locator("#keepOff").click();
    await expect(page.locator("body")).toHaveAttribute("data-page", "map");
    await expect(page.locator("#bsheet")).toBeVisible();
    await page.getByRole("button", { name: "Close panel", exact: true }).click();
    await expect(page.locator("#navCam")).toBeVisible();
    const clips = await page.evaluate(async () => (await import("/src/data/store.js")).allClips());
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({ name: "Checked house", sent: false, blob: null, videoDeleted: true });
    expect(errors).toEqual([]);
  });
});

test("empty drive and unavailable training have clear states", async ({ page }) => {
  const errors = await setup(page);
  await page.route("**/api/training", route => route.fulfill({ json: [] }));
  await page.route("**/api/train", route => route.fulfill({ json: { state: "idle", capabilities: { available: false, error: "Training worker unavailable" } } }));
  await page.route("**/api/models", route => route.fulfill({ json: { active: null, candidate: null, previous: null } }));
  await page.evaluate(async () => {
    (await import("/src/data/state.js")).state.drive = { id: Date.now(), pics: [], secs: 0 };
    await (await import("/src/components/router.js")).go("drive");
  });
  await expect(page.getByRole("heading", { name: "0 buildings found" })).toBeVisible();
  await page.locator("#dDone").click();
  await page.locator("#settingsB").click();
  await page.locator('[data-to="training"]').click();
  await expect(page.getByRole("heading", { name: "No training pictures" })).toBeVisible();
  expect(errors).toEqual([]);
});
