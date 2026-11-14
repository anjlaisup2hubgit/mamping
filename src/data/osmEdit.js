// Writes to OpenStreetMap: add missing details to a building, or add a new building.
import { OSM_API } from "./config.js";
import { getToken } from "./osmAuth.js";

const x = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

export async function call(method, path, body) {
  const r = await fetch(`${OSM_API}/api/0.6/${path}`, {
    method, body, headers: { Authorization: "Bearer " + getToken(), "Content-Type": "text/xml" }
  });
  if (!r.ok) throw new Error("OpenStreetMap said " + r.status);
  return r.text();
}

export async function withChangeset(comment, source, work) {
  const tags = { created_by: "Mamping", comment, source };
  const xml = `<osm><changeset>${Object.entries(tags).map(([k, v]) => `<tag k="${k}" v="${x(v)}"/>`).join("")}</changeset></osm>`;
  const id = (await call("PUT", "changeset/create", xml)).trim();
  try { return await work(id); } finally { await call("PUT", `changeset/${id}/close`).catch(() => {}); }
}

// Adds only tags the building does not have yet. Never overwrites.
// Returns { added: {key: value}, cs, version } so the edit can be listed and undone.
export function addMissingTags(wayId, wanted, comment) {
  return withChangeset(comment, "survey", async cs => {
    const doc = new DOMParser().parseFromString(await call("GET", `way/${wayId}`), "text/xml");
    const way = doc.querySelector("way");
    const have = new Set([...way.querySelectorAll("tag")].map(t => t.getAttribute("k")));
    const keys = Object.keys(wanted).filter(k => wanted[k] && !have.has(k));
    if (!keys.length) return { added: {}, cs };
    keys.forEach(k => {
      const t = doc.createElement("tag");
      t.setAttribute("k", k); t.setAttribute("v", String(wanted[k]));
      way.appendChild(t);
    });
    way.setAttribute("changeset", cs);
    const version = +(await call("PUT", `way/${wayId}`, new XMLSerializer().serializeToString(doc.documentElement)));
    return { added: Object.fromEntries(keys.map(k => [k, String(wanted[k])])), cs, version };
  });
}

// Adds new buildings in one changeset. Each item is { corners: [[lat, lng], ...], tags }.
// Returns { cs, ways: [{ id, v, nodes: [{ id, v, lat, lon }] }] } with the ids OpenStreetMap gave them.
// source says where the outlines came from (shown on the changeset for other mappers).
export function createBuildings(items, comment, source = "Esri World Imagery") {
  return withChangeset(comment, source, async cs => {
    let id = 0, parts = "";
    const made = [];
    for (const { corners, tags } of items) {
      const ids = corners.map(() => --id);
      const nodes = corners.map(([lat, lng], i) => `<node id="${ids[i]}" changeset="${cs}" lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}"/>`).join("");
      const refs = [...ids, ids[0]].map(r => `<nd ref="${r}"/>`).join("");
      const t = Object.entries({ building: "yes", ...tags }).filter(([, v]) => v).map(([k, v]) => `<tag k="${x(k)}" v="${x(v)}"/>`).join("");
      parts += `${nodes}<way id="${--id}" changeset="${cs}">${refs}${t}</way>`;
      made.push({ id, nodes: ids.map((n, i) => ({ id: n, lat: corners[i][0], lon: corners[i][1] })) });
    }
    const diff = new DOMParser().parseFromString(await call("POST", `changeset/${cs}/upload`, `<osmChange version="0.6" generator="Mamping"><create>${parts}</create></osmChange>`), "text/xml");
    const real = old => { const e = diff.querySelector(`[old_id="${old}"]`); return { id: +e.getAttribute("new_id"), v: +e.getAttribute("new_version") }; };
    return { cs, ways: made.map(w => ({ ...real(w.id), nodes: w.nodes.map(n => ({ ...n, ...real(n.id) })) })) };
  });
}
