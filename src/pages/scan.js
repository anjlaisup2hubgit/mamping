// Scan: matches the video to a building while a progress bar fills.
import { state } from "../data/state.js";
import { matchClip } from "../data/matching.js";
import { $ } from "../components/dom.js";
import { go } from "../components/router.js";
import { map, centerOn } from "../components/mapView.js";
import { loadBuildings } from "../components/buildingLayer.js";
import { toast } from "../components/toast.js";

const progress = (percent, text) => {
  $("#pb").style.width = percent + "%";
  if (text) $("#st").textContent = text;
};

export const scan = {
  async open(el) {
    el.innerHTML = `<div class="pad center left"><h2>Reading your video</h2><div class="bar"><i id="pb"></i></div><p class="mid" id="st" style="margin:0">Finding nearby buildings</p></div>`;
    requestAnimationFrame(() => progress(20));
    const clip = state.clip;
    const p = clip.track[Math.floor(clip.track.length / 2)] || map.getCenter();
    centerOn([p.lat, p.lng]);
    await loadBuildings().catch(() => {}); // still go on without nearby buildings
    progress(70, "Matching to OpenStreetMap");
    const result = await matchClip(clip, p, text => progress(70, text));
    if (result.aiFailed) toast("AI is unavailable. Using your location instead.");
    state.match = result.match;
    state.ai = result.ai;
    progress(100);
    setTimeout(() => go("review"), 400);
  }
};
