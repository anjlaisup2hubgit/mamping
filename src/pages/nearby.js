// Nearby: buildings within one mile that already have contributions.
import { state } from "../data/state.js";
import { loadShared, loadContribs, groupNearby } from "../data/contributions.js";
import { $, esc } from "../components/dom.js";
import { go } from "../components/router.js";
import { header, bindBack } from "../components/header.js";
import { viewCenter, centerOn } from "../components/mapView.js";
import { showBuilding } from "../components/buildingSheet.js";

const row = g => {
  const b = state.buildings.get(g.id);
  const n = g.items.length;
  return `<button class="item" data-id="${g.id}"><b>${esc(b?.name || g.items[0].name || "Building")}</b><br><span class="mid">${g.miles.toFixed(2)} mi · ${n} video${n > 1 ? "s" : ""}</span></button>`;
};

export const nearby = {
  async open(el) {
    el.innerHTML = header("Nearby · 1 mile") + '<div class="pad scroll" id="list"></div>';
    bindBack(el);
    const c = viewCenter();
    await loadShared(c);
    await loadContribs();
    const groups = groupNearby([c.lat, c.lng]);
    $("#list").innerHTML = groups.length ? groups.map(row).join("") : '<p class="mid">No contributions within one mile yet. Record a video to add the first.</p>';
    $("#list").querySelectorAll(".item").forEach(e => {
      e.onclick = () => {
        go("home");
        const b = state.buildings.get(+e.dataset.id);
        if (b) { centerOn(b.center); showBuilding(b.id); }
      };
    });
  }
};
