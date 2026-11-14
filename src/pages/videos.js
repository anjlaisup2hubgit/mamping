// Recorded videos: every video you filmed, so you can come back and have the AI check the ones it has not read yet.
import { state } from "../data/state.js";
import { loadContribs } from "../data/contributions.js";
import { header, bindBack } from "../components/header.js";
import { icons } from "../components/icons.js";
import { go } from "../components/router.js";
import { videoRow } from "../components/videoRow.js";

const empty = `<div class="empty">${icons.video}<h2>You have no videos</h2><p class="mid" style="margin:0">Start filming to see your videos here.</p><button class="big primary" data-to="camera" style="max-width:260px">Start filming</button></div>`;

export const videos = {
  async open(el) {
    el.innerHTML = header("Recorded videos") + `<div class="pad scroll" id="list"><p class="mid">Loading…</p></div>`;
    bindBack(el, "settings");
    await loadContribs();
    const list = el.querySelector("#list");
    if (!list) return; // you already left while the videos were loading
    const mine = state.contribs.filter(c => c.blob || c.videoDeleted).sort((a, b) => b.id - a.id);
    list.innerHTML = mine.length ? mine.map(videoRow).join("") : empty;
    list.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
    list.querySelectorAll("[data-check]").forEach(b => {
      b.onclick = () => { state.clip = mine.find(c => c.id === +b.dataset.check); go("scan"); };
    });
  }
};
