// Saves app files and map pictures on the phone so repeat visits open instantly.
const APP = "app-v1", TILES = "tiles-v1", MAX_TILES = 400;
const isTile = u => /tile\.openstreetmap\.org|arcgisonline\.com|unpkg\.com/.test(u.hostname);

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

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

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.pathname.startsWith("/api/")) return;
  if (isTile(url)) return e.respondWith(fastThenFresh(req, TILES).catch(() => Response.error()));
  if (url.origin === location.origin) e.respondWith(fastThenFresh(req, APP, { ignoreSearch: req.mode === "navigate" }).catch(() => Response.error()));
});
