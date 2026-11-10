// Loads real building outlines from OpenStreetMap.
import { OVERPASS_URL } from "./config.js";
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

async function ask(query) {
  const r = await fetch(OVERPASS_URL, {
    method: "POST", body: "data=" + encodeURIComponent(query),
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  if (!r.ok) throw new Error(r.status);
  return (await r.json()).elements.filter(w => w.geometry);
}

export async function fetchBuildingsIn(b) {
  const box = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
  return (await ask(`[out:json][timeout:25];way["building"](${box});out geom tags 800;`)).map(toBuilding);
}

export async function fetchBuildingById(id) {
  const list = await ask(`[out:json];way(${id});out geom tags;`);
  return list[0] ? toBuilding(list[0]) : null;
}
