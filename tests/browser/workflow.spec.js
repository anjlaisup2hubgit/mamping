import { test, expect } from "@playwright/test";
import { setup, roofs, openFirstRoof } from "./fixtures.js";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 568 }, { width: 390, height: 400 }]) {
  test(`building details, undo and reachable handles at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = await setup(page, { boxes: roofs() });
    await openFirstRoof(page);
    await page.locator("#outlineDetails summary").click();
    await page.locator("#sn").fill("Saved house");
    await page.locator("#rf").fill("3");
    await page.locator('[data-act="next"]').click();
    await page.locator('[data-act="prev"]').click();
    await expect(page.locator("#sn")).toHaveValue("Saved house");
    await expect(page.locator("#rf")).toHaveValue("3");
    const coordinates = () => page.evaluate(async () => (await import("/src/components/missingLayer.js")).currentBoxes()[0].coords);
    const original = await coordinates();
    await page.locator(".editorAdvanced summary").click();
    await page.keyboard.press("r");
    expect(await coordinates()).not.toEqual(original);
    await page.locator('[data-act="next"]').click();
    await page.locator('[data-act="prev"]').click();
    await page.locator('[data-act="undo"]').click();
    expect(await coordinates()).toEqual(original);
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll(".corner-hit")].every(el => {
      const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      return x > 0 && x < innerWidth && y > 0 && y < innerHeight && document.elementFromPoint(x, y)?.closest(".corner-hit") === el;
    }))).toBe(true);
    await page.reload();
    await openFirstRoof(page);
    await expect(page.locator("#sn")).toHaveValue("Saved house");
    await expect(page.locator("#rf")).toHaveValue("3");
    expect(errors).toEqual([]);
  });
}

test("unreviewed suggestions cannot be batch-published and restored scans request an area", async ({ page }) => {
  const errors = await setup(page, { boxes: roofs() });
  await page.evaluate(async () => (await import("/src/components/reviewBar.js")).showReview());
  await expect(page.locator("#addKept")).toBeDisabled();
  await expect(page.locator(".rcount")).toContainText("2 unreviewed");
  await page.evaluate(async () => (await import("/src/components/shapeTools.js")).showIdleTools());
  await page.locator('.editRail [data-act="scan"]').click();
  await expect(page.locator("#scanArea")).toBeVisible();
  expect(errors).toEqual([]);
});

test("scan cancellation leaves a persistent result and allows another area", async ({ page }) => {
  let asked = false, release;
  const errors = await setup(page, { outline: async route => {
    asked = true;
    await new Promise(resolve => { release = resolve; });
    await route.fulfill({ json: { buildings: [] } }).catch(() => {});
  } });
  await page.locator("#findMiss").click();
  await page.mouse.click(195, 300);
  await page.locator("#scanArea:not([disabled])").click();
  await expect.poll(() => asked).toBe(true);
  await expect(page.locator("#findMiss")).toBeDisabled();
  await page.getByRole("button", { name: "Cancel scan" }).click();
  release();
  await expect(page.locator("#findMiss")).toBeEnabled();
  await expect(page.locator(".scanProgress")).toContainText(/cancelled/i);
  await page.locator("#findMiss").click();
  await expect(page.locator("#scanArea")).toBeVisible();
  expect(errors).toEqual([]);
});

test("training removals autosave through navigation and returned job failures stay visible", async ({ page }) => {
  const scenes = ["scene-a", "scene-b"].map(name => ({ name, labels: "0 0.25 0.25 0.2 0.2\n0 0.7 0.7 0.2 0.2\n", status: "", revision: 1 }));
  const errors = await setup(page);
  await page.route("**/api/training", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: scenes });
    const body = route.request().postDataJSON(), p = scenes.find(p => p.name === body.name);
    p.labels = body.labels; p.status = body.status === "draft" ? "" : body.status; p.revision++;
    return route.fulfill({ json: { ok: true, revision: p.revision, status: p.status } });
  });
  await page.route("**/api/train", route => route.fulfill({ json: { state: route.request().method() === "POST" ? "failed" : "idle", error: "Evaluation needs another geographic area.", capabilities: { available: true, localOnly: true } } }));
  await page.route("**/api/models", route => route.fulfill({ json: { active: null, candidate: null, previous: null } }));
  await page.route("**/api/training-image?*", route => route.fulfill({ body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"), contentType: "image/png" }));
  await page.locator("#settingsB").click();
  await page.locator('[data-to="training"]').click();
  await expect(page.locator("#roofN")).toHaveText("2");
  await page.locator('rect[data-i="0"]').click();
  await page.locator('[data-label-act="remove"]').click();
  await expect(page.locator("#roofN")).toHaveText("1");
  await page.locator("#next").click(); await page.locator("#prev").click();
  await expect(page.locator("#roofN")).toHaveText("1");
  await page.locator("#trainGo").click();
  await expect(page.locator("#trainMessage")).toHaveText("Evaluation needs another geographic area.");
  expect(scenes[0].labels.trim().split("\n")).toHaveLength(1);
  expect(errors).toEqual([]);
});
