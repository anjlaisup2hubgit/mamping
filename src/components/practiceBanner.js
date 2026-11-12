// Loud red strip + tab title so you never mistake the practice server for the real map.
import { OSM_PRACTICE } from "../data/config.js";

export function showPracticeBanner() {
  if (!OSM_PRACTICE) return;
  document.title = "PRACTICE - Mamping";
  const bar = document.createElement("div");
  bar.textContent = "PRACTICE SERVER - edits are not real";
  bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#d00;color:#fff;font:700 12px sans-serif;text-align:center;padding:3px;pointer-events:none";
  document.body.appendChild(bar);
}
