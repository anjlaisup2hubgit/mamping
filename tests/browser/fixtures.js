// Real map/editor code, with external services isolated: these tests never write to OpenStreetMap.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tile = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const files = {
  "/npm/leaflet@1.9.4/dist/leaflet.js": "leaflet/dist/leaflet.js",
  "/npm/leaflet@1.9.4/dist/leaflet.css": "leaflet/dist/leaflet.css",
  "/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js": "maplibre-gl/dist/maplibre-gl.js",
  "/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css": "maplibre-gl/dist/maplibre-gl.css",
  "/npm/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js": "@maplibre/maplibre-gl-leaflet/leaflet-maplibre-gl.js"
};

export function roofs() {
  return [0, 1].map(i => {
    const lat = 20.8449, lng = 106.6881 + i * 0.0004;
    return { id: `fixture-${i}`, coords: [[lat, lng], [lat, lng + .00024], [lat - .00016, lng + .00024], [lat - .00016, lng]],
      center: [lat - .00008, lng + .00012], confidence: .85, keep: true, reviewed: false, tags: {}, from: "Microsoft" };
  });
}

export async function setup(page, { boxes = [], outline } = {}) {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(boxes => {
    if (!localStorage.getItem("missing_scan:guest")) localStorage.setItem("missing_scan:guest", JSON.stringify(boxes));
    if (!localStorage.getItem("display_settings")) localStorage.setItem("display_settings", JSON.stringify({ enhancement: "off", autoTidy: false }));
  }, boxes);
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.hostname === "cdn.jsdelivr.net" && files[url.pathname]) {
      return route.fulfill({ body: await readFile(require.resolve(files[url.pathname])), contentType: url.pathname.endsWith(".css") ? "text/css" : "text/javascript" });
    }
    if (url.hostname === "tiles.openfreemap.org") return route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "base", type: "background", paint: { "background-color": "#e4e6df" } }] } });
    if (["server.arcgisonline.com", "tile.openstreetmap.org"].includes(url.hostname)) return route.fulfill({ body: tile, contentType: "image/png", headers: { "Access-Control-Allow-Origin": "*" } });
    if (url.hostname === "api.openstreetmap.org") {
      if (route.request().method() !== "GET") throw new Error("A browser test tried to write to OpenStreetMap.");
      return route.fulfill({ json: { elements: [] } });
    }
    if (url.hostname.includes("overpass")) return route.fulfill({ json: { elements: [] } });
    if (url.pathname === "/api/ready" || url.pathname === "/api/contributions") return route.fulfill({ json: [] });
    if (url.pathname === "/api/outline" && outline) return outline(route);
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  await page.goto("/");
  await page.locator("#findMiss").waitFor();
  return errors;
}

export async function openFirstRoof(page) {
  await page.locator("#settingsB").click();
  await page.locator('[data-to="outlines"]').click();
  await page.locator('[data-i="0"]').click();
  await page.locator("#bsheet.editorSheet").waitFor();
}
