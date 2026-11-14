// Settings: your account at the top, then one short list. Each row opens its own page, so this screen never gets crowded.
import { header, bindBack } from "../components/header.js";
import { osmAccount, bindOsmAccount } from "../components/osmAccount.js";
import { currentBoxes } from "../components/missingLayer.js";
import { icons } from "../components/icons.js";
import { go } from "../components/router.js";
import { state } from "../data/state.js";
import { loadContribs } from "../data/contributions.js";
import { weekCounts } from "../data/history.js";
import { getSettings } from "../data/settings.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// One tappable row: icon, title, a short line under it, and an arrow.
const row = (to, icon, title, sub, id = "") =>
  `<button class="lrow" data-to="${to}"><span class="lic">${icon}</span><span class="who"><b>${title}</b><span class="mid" ${id ? `id="${id}"` : ""}>${sub}</span></span><span class="chev">›</span></button>`;

function page() {
  const boxes = currentBoxes().length, { heights, buildings } = weekCounts();
  return `<div class="pad">${osmAccount()}
  <div class="card list" style="margin-top:16px">
    ${row("videos", icons.video, "Recorded videos", "Loading…", "vidSub")}
    ${row("outlines", icons.scan, "Scanned outlines", boxes ? `${plural(boxes, "missing building")} to check` : "None yet")}
    ${row("edits", icons.list, "My edits", heights || buildings ? `This week: ${plural(heights, "height")}, ${plural(buildings, "building")}` : "Nothing added this week")}
    ${row("scanSettings", icons.settings, "Scan options", getSettings().outline === "roof" ? "Roof shape outlines" : "Rectangle outlines")}
    ${row("help", icons.help, "How to use Mamping", "Filming tips and a quick tour")}</div></div>`;
}

// Fills in how many videos you have and how many still need the AI.
async function countVideos(el) {
  await loadContribs();
  const mine = state.contribs.filter(c => c.blob || c.videoDeleted), waiting = mine.filter(c => c.blob).length;
  const sub = el.querySelector("#vidSub");
  if (sub) sub.textContent = mine.length ? plural(mine.length, "video") + (waiting ? ` · ${waiting} not checked by AI` : "") : "None yet";
}

export const settings = {
  open(el) {
    el.innerHTML = header("Settings") + `<div class="scroll">${page()}</div>`;
    bindBack(el);
    el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
    bindOsmAccount();
    countVideos(el);
  }
};
