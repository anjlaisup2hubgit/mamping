// Sharper close-up satellite photos. Past zoom 19 the photos are only stretched, so each one is
// doubled on this device by the picture model (see data/enhanceImage.js), its edges crisped, and laid over the blurry one.
import { SATELLITE_TILE_URL } from "../data/config.js";
import { sharpenPhoto } from "../data/enhanceImage.js";
import { crispEdges } from "../data/edgeFilter.js";
import { getSettings } from "../data/settings.js";
import { map, currentBase, MAX_ZOOM } from "./mapView.js";

const KEEP = 150; // finished photos remembered, so scrolling back is instant
const photos = new Map(); // photo address -> { result, users, done, stop }
let layer = null;

// One sharpened photo covers four close-up squares, so it is made once and shared by them.
function sharpen(url) {
  let job = photos.get(url);
  if (!job) {
    const stop = new AbortController();
    job = { users: 0, done: false, stop };
    job.result = fetch(url, { signal: stop.signal })
      .then(r => { if (!r.ok) throw new Error(`Satellite photo failed (${r.status}).`); return r.blob(); })
      .then(async blob => {
        const picture = new Image(), local = URL.createObjectURL(blob); // a local copy, so the model may read its pixels
        picture.src = local;
        try { await picture.decode(); picture.src = await sharpenPhoto(picture, { signal: stop.signal }); }
        finally { URL.revokeObjectURL(local); }
        await picture.decode();
        return crispEdges(picture); // the model alone still looks soft, so roof edges get a final crisping
      });
    job.result.then(() => { job.done = true; forgetOld(); }, () => photos.delete(url)); // a failed one is tried again next time
    photos.set(url, job);
  }
  job.users++;
  return job.result;
}

// Nobody is looking at this photo any more: stop it if it is still waiting for the model.
function release(url) {
  const job = photos.get(url);
  if (!job || --job.users > 0 || job.done) return;
  job.stop.abort();
  photos.delete(url);
}

function forgetOld() {
  for (const [url, job] of photos) {
    if (photos.size <= KEEP) return;
    if (job.done && job.users <= 0) photos.delete(url);
  }
}

// Each square at zoom 20 is one quarter of a zoom 19 photo; it stays see-through until its sharp part is ready.
const SharpLayer = L.GridLayer.extend({
  createTile(c, done) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 256;
    tile.dataset.photo = L.Util.template(SATELLITE_TILE_URL, { z: 19, x: c.x >> 1, y: c.y >> 1 });
    sharpen(tile.dataset.photo)
      .then(async src => {
        const sharp = new Image();
        sharp.src = src;
        await sharp.decode();
        tile.getContext("2d").drawImage(sharp, (c.x % 2) * 256, (c.y % 2) * 256, 256, 256, 0, 0, 256, 256);
      })
      .then(() => done(null, tile), e => done(e, tile));
    return tile;
  }
});

// Shown only on the satellite map with the "Sharper photos" setting on.
export function syncSharpPhotos() {
  const want = getSettings().sharpPhotos && currentBase() === "satellite";
  if (want && !layer) {
    layer = new SharpLayer({ minZoom: 20, maxNativeZoom: 20, maxZoom: MAX_ZOOM, keepBuffer: 2 })
      .on("tileunload", e => release(e.tile.dataset.photo))
      .addTo(map);
  } else if (!want && layer) {
    map.removeLayer(layer);
    layer = null;
  }
}
