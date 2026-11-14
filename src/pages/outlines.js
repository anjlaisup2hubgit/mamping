// Scanned outlines: the missing buildings found by your scans, so you can go back to any of them later.
import { header, bindBack } from "../components/header.js";
import { go } from "../components/router.js";
import { centerOn } from "../components/mapView.js";
import { currentBoxes, focusBox } from "../components/missingLayer.js";
import { showSuggestion } from "../components/suggestSheet.js";

const empty = `<div class="empty"><h2>No scanned outlines</h2><p class="mid" style="margin:0">Tap the scan button on the map to look for missing buildings.</p><button class="big primary" data-to="map" style="max-width:260px">Go to the map</button></div>`;

const row = (b, i) => `<button class="mrow" data-i="${i}"><span class="num">${i + 1}</span><span class="mname">Missing building<small class="mid">${b.from ? "from " + b.from : "AI scan"}</small></span></button>`;

export const outlines = {
  open(el) {
    const boxes = currentBoxes();
    el.innerHTML = header("Scanned outlines") + `<div class="pad scroll">${boxes.length ? `<p class="mid" style="margin:0">Tap one to see it on the map.</p>${boxes.map(row).join("")}` : empty}</div>`;
    bindBack(el, "settings");
    el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
    el.querySelectorAll("[data-i]").forEach(r => {
      r.onclick = async () => {
        const b = boxes[r.dataset.i];
        await go("map");
        centerOn(b.center, 19);
        focusBox(b);
        showSuggestion(b);
      };
    });
  }
};
