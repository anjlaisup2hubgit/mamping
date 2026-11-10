// Writes to OpenStreetMap: add missing details to a building, or add a new building.
import { OSM_API } from "./config.js";
import { getToken } from "./osmAuth.js";

const x = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

async function call(method, path, body) {
  const r = await fetch(`${OSM_API}/api/0.6/${path}`, {
    method, body, headers: { Authorization: "Bearer " + getToken(), "Content-Type": "text/xml" }
  });
  if (!r.ok) throw new Error("OpenStreetMap said " + r.status);
  return r.text();
}

async function withChangeset(comment, source, work) {
  const tags = { created_by: "Hometown Map", comment, source };
  const xml = `<osm><changeset>${Object.entries(tags).map(([k, v]) => `<tag k="${k}" v="${x(v)}"/>`).join("")}</changeset></osm>`;
  const id = (await call("PUT", "changeset/create", xml)).trim();
  try { return await work(id); } finally { await call("PUT", `changeset/${id}/close`).catch(() => {}); }
}

// Adds only tags the building does not have yet. Never overwrites. Returns the tags added.
export function addMissingTags(wayId, wanted, comment) {
  return withChangeset(comment, "survey", async cs => {
    const doc = new DOMParser().parseFromString(await call("GET", `way/${wayId}`), "text/xml");
    const way = doc.querySelector("way");
    const have = new Set([...way.querySelectorAll("tag")].map(t => t.getAttribute("k")));
    const added = Object.keys(wanted).filter(k => wanted[k] && !have.has(k));
    if (!added.length) return [];
    added.forEach(k => {
      const t = doc.createElement("tag");
      t.setAttribute("k", k); t.setAttribute("v", String(wanted[k]));
      way.appendChild(t);
    });
    way.setAttribute("changeset", cs);
    await call("PUT", `way/${wayId}`, new XMLSerializer().serializeToString(doc.documentElement));
    return added;
  });
}

// Adds a new building from a list of [lat, lng] corners.
export function createBuilding(corners, tags, comment) {
  return withChangeset(comment, "Esri World Imagery", async cs => {
    const nodes = corners.map(([lat, lng], i) => `<node id="${-(i + 1)}" changeset="${cs}" lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}"/>`).join("");
    const refs = [...corners.map((_, i) => -(i + 1)), -1].map(r => `<nd ref="${r}"/>`).join("");
    const all = { building: "yes", ...tags };
    const t = Object.entries(all).filter(([, v]) => v).map(([k, v]) => `<tag k="${x(k)}" v="${x(v)}"/>`).join("");
    const change = `<osmChange version="0.6" generator="Hometown Map"><create>${nodes}<way id="-100" changeset="${cs}">${refs}${t}</way></create></osmChange>`;
    await call("POST", `changeset/${cs}/upload`, change);
    return true;
  });
}
