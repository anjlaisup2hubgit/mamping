// Home: welcome card and the list of your videos.
import { state } from "../data/state.js";
import { loadContribs } from "../data/contributions.js";
import { $ } from "../components/dom.js";
import { go } from "../components/router.js";
import { icons } from "../components/icons.js";
import { videoRow } from "../components/videoRow.js";
import { bottomNav, bindNav } from "../components/bottomNav.js";
import { osmAccount, bindOsmAccount } from "../components/osmAccount.js";

const empty = `<div class="empty">${icons.video}<h2>You have no videos</h2><p class="mid" style="margin:0">Start filming to see your videos here.</p></div>`;

export const home = {
  async open(el) {
    el.innerHTML = `<div class="welcome pad"><h1>Welcome</h1><p>Head outside, film a building and help complete the map of your town.</p><button class="big ghost" id="start" style="color:var(--ink)">Start capturing</button></div>
      <div class="pad" id="osm" style="padding-top:14px">${osmAccount()}</div>
      <div class="pad scroll" id="list" style="padding-top:16px;padding-bottom:120px"></div>` + bottomNav("home");
    bindNav(el);
    bindOsmAccount(() => home.open(el));
    $("#start").onclick = () => go("camera");
    await loadContribs();
    const mine = state.contribs.filter(c => c.blob).sort((a, b) => b.id - a.id);
    $("#list").innerHTML = mine.length ? "<h2>My videos</h2>" + mine.map(videoRow).join("") : empty;
  }
};
