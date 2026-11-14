// Takes back one of your own OpenStreetMap edits, only if nobody changed the building since.
import { call, withChangeset } from "./osmEdit.js";
import { markUndone } from "./history.js";

// Removes the tags you added, if the building is still exactly as you left it.
async function undoTags(e, cs) {
  const doc = new DOMParser().parseFromString(await call("GET", `way/${e.wayId}`), "text/xml");
  const way = doc.querySelector("way");
  if (+way.getAttribute("version") !== e.version) throw new Error("someone edited it since");
  way.querySelectorAll("tag").forEach(t => { if (e.added[t.getAttribute("k")] === t.getAttribute("v")) t.remove(); });
  way.setAttribute("changeset", cs);
  await call("PUT", `way/${e.wayId}`, new XMLSerializer().serializeToString(doc.documentElement));
}

// Deletes the buildings you added and their corner points.
async function undoCreate(e, cs) {
  const ways = e.ways.map(w => `<way id="${w.id}" version="${w.v}" changeset="${cs}"/>`).join("");
  const nodes = e.ways.flatMap(w => w.nodes).map(n => `<node id="${n.id}" version="${n.v}" changeset="${cs}" lat="${n.lat}" lon="${n.lon}"/>`).join("");
  await call("POST", `changeset/${cs}/upload`, `<osmChange version="0.6" generator="Mamping"><delete>${ways}${nodes}</delete></osmChange>`);
}

export async function undoEdit(e) {
  try {
    await withChangeset("Undo my earlier Mamping edit (changeset " + e.cs + ")", "survey", cs => (e.kind === "tags" ? undoTags(e, cs) : undoCreate(e, cs)));
  } catch (err) {
    throw new Error(/409|412/.test(err.message) ? "someone edited it since" : err.message); // 409/412 = changed by someone else
  }
  markUndone(e.at);
}
