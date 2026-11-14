// Loads real building outlines from OpenStreetMap.
import { OVERPASS_URLS, OSM_API } from "./config.js";
import { mid } from "./geo.js";

const number = t => { const n = parseFloat(String(t ?? "").replace(",", ".")); return isFinite(n) ? n : null; };

function toBuilding(w) {
  const t = w.tags || {};
  const coords = w.geometry.map(g => [g.lat, g.lon]);
  return {
    id: w.id, coords, center: mid(coords), kind: t.building,
    name: t.name || t["name:vi"] || null,
    ht: number(t.height), levels: number(t["building:levels"]),
    addr: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ")
  };
}

// Free servers are often busy, so try each one (up to 20 seconds) until one answers.
async function ask(query) {
  let last;
  for (const url of OVERPASS_URLS) {
    try {
      const r = await fetch(url, {
        method: "POST", body: "data=" + encodeURIComponent(query), signal: AbortSignal.timeout(20000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      if (!r.ok) throw new Error(r.status);
      return (await r.json()).elements.filter(w => w.geometry);
    } catch (e) { last = e; }
  }
  throw last;
}

// OpenStreetMap's own server: always up to date, so new edits show at once. It refuses very crowded areas, so Overpass backs it up.
// Returns the ways in the box that have tag `key` (e.g. "building"), each with its points in `geometry`.
async function fromOsmApi(w, s, e, n, key) {
  const r = await fetch(`${OSM_API}/api/0.6/map.json?bbox=${w},${s},${e},${n}`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(r.status);
  const all = (await r.json()).elements;
  const nodes = new Map(all.filter(x => x.type === "node").map(x => [x.id, x]));
  return all.filter(x => x.type === "way" && x.tags?.[key])
    .map(x => ({ ...x, geometry: x.nodes.map(id => nodes.get(id)).filter(Boolean) }));
}

export async function fetchBuildingsIn(b) {
  try { return (await fromOsmApi(b.getWest(), b.getSouth(), b.getEast(), b.getNorth(), "building")).filter(w => w.geometry.length > 2).map(toBuilding); } catch (e) { /* fall back to Overpass below */ }
  const box = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  return (await ask(`[out:json][timeout:25];way["building"](${box});out geom tags;`)).map(toBuilding);
}

// Roads within r metres of a point, each as a list of [lat, lng].
export async function fetchRoadsNear(lat, lng, r) {
  const dLat = r / 111320, dLng = dLat / Math.cos(lat * Math.PI / 180); // metres to degrees
  let ways;
  try { ways = await fromOsmApi(lng - dLng, lat - dLat, lng + dLng, lat + dLat, "highway"); }
  catch (e) { ways = await ask(`[out:json][timeout:25];way["highway"](around:${r},${lat},${lng});out geom;`); }
  return ways.filter(w => w.geometry.length > 1).map(w => w.geometry.map(g => [g.lat, g.lon]));
}

export async function fetchBuildingById(id) {
  const list = await ask(`[out:json];way(${id});out geom tags;`);
  return list[0] ? toBuilding(list[0]) : null;
}
