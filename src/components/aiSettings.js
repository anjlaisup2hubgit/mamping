// Settings card for the missing-building scan: how to draw outlines, and the user's own Gemini key.
import { getSettings, saveSetting } from "../data/settings.js";

const OUTLINES = [["rect", "Rectangle", "Fast and simple"], ["roof", "Roof shape", "Downloads ~100 MB the first time"]];
const FINDERS = [["online", "Online AI", "Uses your Gemini key"], ["device", "On this device", "Free, ~170 MB once"], ["both", "Both", "They check each other"]];

export function aiSettings() {
  const s = getSettings();
  return `<div class="card"><p class="cardTitle">Find roofs with</p>
    <div class="seg">${FINDERS.map(([v, t, sub]) => `<button class="${s.finder === v ? "on" : ""}" data-set="finder" data-val="${v}"><b>${t}</b><span>${sub}</span></button>`).join("")}</div>
    <p class="mid" style="margin:6px 0 14px;font-size:13px">"On this device" uses a free AI model (Grounding DINO) that looks for roofs by name. It runs on your phone, so pictures are never uploaded, but it is slower. "Both" runs the two and checks them against each other: roofs they agree on are marked 90% sure, roofs only one found are marked 50% or less.</p>
    <p class="cardTitle">Draw outlines as</p>
    <div class="seg">${OUTLINES.map(([v, t, sub]) => `<button class="${s.outline === v ? "on" : ""}" data-set="outline" data-val="${v}"><b>${t}</b><span>${sub}</span></button>`).join("")}</div>
    <p class="mid" style="margin:6px 0 0;font-size:13px"><b>Rectangle:</b> a plain 4-sided box around each building. Quick, but corners may stick out past L-shaped or angled roofs.<br><b>Roof shape:</b> a free AI model (SlimSAM) traces each roof's real outline, so it hugs the building more closely. It downloads once (~100 MB, best on Wi-Fi), is saved in this browser, and runs on your device — your pictures are never uploaded.</p>
    <label for="gk" style="margin-top:14px">Your Gemini key <span class="mid">(optional, from aistudio.google.com)</span></label>
    <input type="password" id="gk" data-key="geminiKey" value="${s.geminiKey.replace(/"/g, "")}" autocomplete="off" placeholder="Paste your own key">
    <p class="mid" style="margin:6px 0 0;font-size:13px">Your key stays in this browser only.</p></div>`;
}

// The [data-set] buttons are wired by the Settings page; this wires the key box.
export function bindAiSettings(el) {
  el.querySelectorAll("[data-key]").forEach(i => { i.oninput = () => saveSetting(i.dataset.key, i.value.trim()); });
}
