// Settings panel for the missing-building scan: how to draw outlines, and the user's own Gemini key.
import { getSettings, saveSetting } from "../data/settings.js";

const OUTLINES = [["rect", "Simple rectangle"], ["roof", "Roof model (runs in your browser, ~100 MB first time)"]];

const group = (title, key, list, now) => `<p><b>${title}</b></p>` +
  list.map(([v, t]) => `<button class="opt ${now === v ? "on" : ""}" data-set="${key}" data-val="${v}">${t}</button>`).join("");

export function aiSettings() {
  const s = getSettings();
  return `<p><b>Find missing buildings</b></p>
    <p class="mid" style="margin:8px 0 4px">Gemini key (aistudio.google.com)</p>
    <input type="password" data-key="geminiKey" value="${s.geminiKey.replace(/"/g, "")}" autocomplete="off" placeholder="Paste your own key">
    ${group("Draw outlines as", "outline", OUTLINES, s.outline)}
    <p class="mid">Keys stay in this browser only.</p>`;
}

// The [data-set] buttons are wired by the Settings page; this wires the key box.
export function bindAiSettings(el) {
  el.querySelectorAll("[data-key]").forEach(i => { i.oninput =() => saveSetting(i.dataset.key, i.value.trim()); });
}
