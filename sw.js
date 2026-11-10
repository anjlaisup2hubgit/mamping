// Saves app files and map pictures on the phone so repeat visits open instantly.
const APP = "app-v3", TILES = "tiles-v1", MAX_TILES = 400;
const isTile = u => /tile\.openstreetmap\.org|arcgisonline\.com|unpkg\.com/.test(u.hostname);

self.addEventListener("install", () => self.skipWaiting());
// Delete old saved app files so new styles show at once.
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("app-") && k !== APP).map(k => caches.delete(k)))).then(() => self.clients.claim())));

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map(k => cache.delete(k)));
}

// Show the saved copy at once, then fetch a fresh copy for next time.
async function fastThenFresh(req, cacheName, opts) {
  const cache = await caches.open(cacheName);
  const saved = await cache.match(req, opts);
  const fresh = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()).then(() => cacheName === TILES && trim(cache)); return r; });
  return saved || fresh;
}

// App files: ask the internet first so updates show at once, use the saved copy only when offline.
async function freshThenSaved(req, cacheName) {
  const cache = await caches.open(cacheName);
  try { const r = await fetch(req, { cache: "no-cache" }); if (r.ok) cache.put(req, r.clone()); return r; }
  catch (e) { return (await cache.match(req, { ignoreSearch: req.mode === "navigate" })) || Response.error(); }
}

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (isTile(url)) return e.respondWith(fastThenFresh(req, TILES).catch(() => Response.error()));
  if (url.origin === location.origin) e.respondWith(freshThenSaved(req, APP).catch(() => Response.error()));
});
