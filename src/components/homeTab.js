// Home tab (inside Settings): welcome card and the list of your videos.
import { state } from "../data/state.js";
import { loadContribs } from "../data/contributions.js";
import { icons } from "./icons.js";
import { go } from "./router.js";
import { videoRow } from "./videoRow.js";
import { editHistory, bindEditHistory } from "./editHistory.js";

const empty = `<div class="empty">${icons.video}<h2>You have no videos</h2><p class="mid" style="margin:0">Start filming to see your videos here.</p><button class="big primary" data-to="camera" style="max-width:260px">Start filming</button></div>`;

export const homeTab = () => `<div class="welcome pad"><h1>Welcome</h1><p>Head outside, film a building and help complete the map of your town.</p></div>
  <div class="pad scroll" id="edits" style="padding-top:16px;padding-bottom:0;overflow:visible"></div>
  <div class="pad" id="list" style="padding-top:16px"></div>`;

export async function fillHomeTab(el) {
  const drawEdits = () => { const e = el.querySelector("#edits"); if (e) { e.innerHTML = editHistory(); bindEditHistory(e, drawEdits); } };
  drawEdits();
  await loadContribs();
  const mine = state.contribs.filter(c => c.blob || c.videoDeleted).sort((a, b) => b.id - a.id);
  const list = el.querySelector("#list");
  if (!list) return; // you already left this tab while the videos were loading
  list.innerHTML = mine.length ? "<h2>My videos</h2>" + mine.map(videoRow).join("") : empty;
  el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
}
