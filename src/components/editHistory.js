// Home tab section: what you added this week, your OpenStreetMap edits with links, and Undo for the newest one.
import { OSM_SITE } from "../data/config.js";
import { getHistory, weekCounts } from "../data/history.js";
import { getQueue } from "../data/osmSend.js";
import { undoEdit } from "../data/osmUndo.js";
import { esc } from "./dom.js";
import { toast } from "./toast.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const link = (path, text) => `<a href="${OSM_SITE}/${path}" target="_blank" rel="noopener">${text}</a>`;

function row(e, canUndo) {
  const what = e.kind === "tags"
    ? `Added ${esc(Object.entries(e.added).map(([k, v]) => `${k}=${v}`).join(", "))} to ${link("way/" + e.wayId, "a building")}`
    : `Added ${plural(e.ways.length, "new building")}: ${e.ways.map((w, i) => link("way/" + w.id, "#" + (i + 1))).join(" ")}`;
  return `<div class="item">${what}<br><span class="mid">${new Date(e.at).toLocaleString()} · ${link("changeset/" + e.cs, "see on OpenStreetMap")}</span>
    ${e.undone ? '<br><span class="tag">Undone</span>' : canUndo ? `<br><button class="ghost show" data-undo="${e.at}" style="margin-top:8px">Undo</button>` : ""}</div>`;
}

export function editHistory() {
  const list = getHistory(), { heights, buildings } = weekCounts(), waiting = getQueue().length;
  const newest = list.find(e => !e.undone); // only the newest edit can be undone, so older fixes stay safe
  const week = heights || buildings ? `This week you added ${plural(heights, "height")} and ${plural(buildings, "building")}. Thank you!` : "Nothing added this week yet. Film a building to add its height.";
  return `<div class="note" style="font-weight:600">${week}</div>
    ${waiting ? `<p class="mid" style="margin:0">${plural(waiting, "edit")} waiting for internet.</p>` : ""}
    ${list.length ? "<h2>My OpenStreetMap edits</h2>" + list.slice(0, 20).map(e => row(e, e === newest)).join("") : ""}`;
}

// redraw is called after an undo so the list updates.
export function bindEditHistory(el, redraw) {
  el.querySelectorAll("[data-undo]").forEach(b => {
    b.onclick = async () => {
      b.disabled = true;
      try {
        await undoEdit(getHistory().find(e => e.at === +b.dataset.undo));
        toast("Edit undone on OpenStreetMap");
        redraw();
      } catch (e) { b.disabled = false; toast("Could not undo: " + e.message); }
    };
  });
}
