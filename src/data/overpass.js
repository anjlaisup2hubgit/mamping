// Loads real building outlines from OpenStreetMap.
import { OVERPASS_URLS } from "./config.js";
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

export async function fetchBuildingsIn(b) {
  const box = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  return (await ask(`[out:json][timeout:25];way["building"](${box});out geom tags 800;`)).map(toBuilding);
}

// Roads within r metres of a point, each as a list of [lat, lng].
export async function fetchRoadsNear(lat, lng, r) {
  return (await ask(`[out:json][timeout:25];way["highway"](around:${r},${lat},${lng});out geom;`))
    .map(w => w.geometry.map(g => [g.lat, g.lon]));
}

export async function fetchBuildingById(id) {
  const list = await ask(`[out:json];way(${id});out geom tags;`);
  return list[0] ? toBuilding(list[0]) : null;
}
