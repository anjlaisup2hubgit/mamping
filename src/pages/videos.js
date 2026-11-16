// Recorded videos: every video you filmed, so you can come back and have the AI check the ones it has not read yet.
import { state } from "../data/state.js";
import { header, bindBack } from "../components/header.js";
import { icons } from "../components/icons.js";
import { go } from "../components/router.js";
import { videoRow } from "../components/videoRow.js";
import { allClips } from "../data/store.js";

const empty = `<div class="empty">${icons.video}<h2>You have no videos</h2><p class="mid" style="margin:0">Start filming to see your videos here.</p><button class="big primary" data-to="camera" style="max-width:260px">Start filming</button></div>`;

export const videos = {
  async open(el) {
    el.innerHTML = header("Your video library") + `<div class="pad scroll"><p class="videoSummary" id="videoSummary">Videos recorded on this device. Your footage stays private.</p><div class="filterBar" role="group" aria-label="Filter videos"><button data-filter="all" class="on" aria-pressed="true">All</button><button data-filter="waiting" aria-pressed="false">To review</button><button data-filter="private" aria-pressed="false">Private</button><button data-filter="shared" aria-pressed="false">Shared details</button></div><div id="list"><p class="mid">Loading…</p></div></div>`;
    bindBack(el, "settings");
    const list = el.querySelector("#list");
    if (!list) return; // you already left while the videos were loading
    let mine;
    try { mine = (await allClips()).filter(c => (c.blob || c.videoDeleted) && !c.fromDrive).sort((a, b) => b.id - a.id); }
    catch { list.innerHTML = '<p class="note">Video storage is unavailable. Allow browser storage, then reopen your library.</p>'; return; }
    if (!el.querySelector("#videoSummary")) return;
    el.querySelector("#videoSummary").textContent = `${mine.length} recording${mine.length === 1 ? "" : "s"} on this device · ${mine.filter(c => c.blob).length} to review. Footage stays private; reviewed details can be shared.`;
    const draw = filter => {
      const shown = mine.filter(c => filter === "all" || (filter === "waiting" ? c.blob : filter === "shared" ? c.sent : !c.sent));
      list.innerHTML = !mine.length ? empty : shown.length ? shown.map(videoRow).join("") : '<div class="empty"><h2>No videos in this view</h2><p class="mid">Choose another filter to see your recordings.</p></div>';
      list.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
      list.querySelectorAll("[data-check]").forEach(b => {
        b.onclick = () => { state.clip = mine.find(c => c.id === +b.dataset.check); go("scan"); };
      });
    };
    el.querySelectorAll("[data-filter]").forEach(b => { b.onclick = () => {
      el.querySelectorAll("[data-filter]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", String(x === b)); });
      draw(b.dataset.filter);
    }; });
    draw("all");
  }
};
