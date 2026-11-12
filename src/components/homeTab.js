// Home tab (inside Settings): welcome card and the list of your videos.
import { state } from "../data/state.js";
import { loadContribs } from "../data/contributions.js";
import { icons } from "./icons.js";
import { videoRow } from "./videoRow.js";

const empty = `<div class="empty">${icons.video}<h2>You have no videos</h2><p class="mid" style="margin:0">Start filming to see your videos here.</p></div>`;

export const homeTab = () => `<div class="welcome pad"><h1>Welcome</h1><p>Head outside, film a building and help complete the map of your town.</p></div>
  <div class="pad" id="list" style="padding-top:16px"></div>`;

export async function fillHomeTab(el) {
  await loadContribs();
  const mine = state.contribs.filter(c => c.blob || c.videoDeleted).sort((a, b) => b.id - a.id);
  el.querySelector("#list").innerHTML = mine.length ? "<h2>My videos</h2>" + mine.map(videoRow).join("") : empty;
}
