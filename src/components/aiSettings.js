// Settings card for the missing-building scan: how to draw outlines, and the user's own Gemini key.
import { getSettings, saveSetting } from "../data/settings.js";

const OUTLINES = [["rect", "Rectangle", "Fast and simple"], ["roof", "Roof shape", "Downloads ~100 MB the first time"]];
const FINDERS = [["online", "Online AI", "Uses your Gemini key"], ["device", "On this device", "Free, ~170 MB once"], ["both", "Both", "They check each other"], ["trained", "My trained model", "Uses the active model on your training computer"]];
const PICTURES = [["off", "Original", "Scan the satellite picture as it is"], ["on", "Clarify first", "Clear up roofs before scanning"]];

export function aiSettings() {
  const s = getSettings();
  return `<div class="card"><p class="cardTitle">Satellite pictures</p>
    <div class="seg">${PICTURES.map(([v, t, sub]) => `<button class="${s.enhancement === v ? "on" : ""}" data-set="enhancement" data-val="${v}"><b>${t}</b><span>${sub}</span></button>`).join("")}</div>
    <p class="mid" style="margin:6px 0 14px;font-size:13px">Original is fastest. Clarify first uses the free ESRGAN Slim model on your device before finding and tracing roofs. It downloads the model (under 1 MB) and its tools the first time and can take about a minute per picture on a CPU. If it cannot run, the original picture is used. Always check outlines against the original map picture: clearer pixels can still be wrong.</p>
    <p class="cardTitle">Find roofs with</p>
    <div class="seg">${FINDERS.map(([v, t, sub]) => `<button class="${s.finder === v ? "on" : ""}" data-set="finder" data-val="${v}"><b>${t}</b><span>${sub}</span></button>`).join("")}</div>
    <p class="mid" style="margin:6px 0 14px;font-size:13px">"On this device" uses a free AI model (Grounding DINO) that looks for roofs by name. It runs on your phone, so pictures are never uploaded, but it is slower. "Both" compares it with online AI. "My trained model" sends pictures to your training computer after you activate an evaluated model on the Training page.</p>
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
