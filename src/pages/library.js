// Library: every video saved on this phone.
import { state } from "../data/state.js";
import { loadContribs } from "../data/contributions.js";
import { $, esc } from "../components/dom.js";
import { header, bindBack } from "../components/header.js";

const row = c => `<div class="item"><b>${esc(c.name || "Unmatched video")}</b><br><span class="mid">${c.secs}s · ${esc(c.at)}</span><br><span class="tag">${c.sent ? "Shared" : "Private, on this phone"}</span></div>`;

export const library = {
  async open(el) {
    el.innerHTML = header("My videos") + '<div class="pad scroll" id="list"></div>';
    bindBack(el);
    await loadContribs();
    const mine = [...state.contribs].sort((a, b) => b.id - a.id);
    $("#list").innerHTML = mine.length ? mine.map(row).join("") : '<p class="mid">No videos yet.</p>';
  }
};
