// Settings: pick colour theme and text size, and connect or leave OpenStreetMap.
import { header, bindBack } from "../components/header.js";
import { osmAccount, bindOsmAccount } from "../components/osmAccount.js";
import { getSettings, saveSetting } from "../data/settings.js";

const THEMES = [["auto", "Match my phone"], ["light", "Light"], ["dark", "Dark"]];
const SIZES = [["small", "Small"], ["normal", "Normal"], ["large", "Large"]];
const group = (title, key, list, now) => `<p><b>${title}</b></p>` +
  list.map(([v, t]) => `<button class="opt ${now === v ? "on" : ""}" data-set="${key}" data-val="${v}">${t}</button>`).join("");

export const settings = {
  open(el) {
    const draw = () => {
      const s = getSettings();
      el.innerHTML = header("Settings") + `<div class="pad scroll">${group("Colour", "theme", THEMES, s.theme)}${group("Text size", "size", SIZES, s.size)}
        <p><b>Login</b></p><div id="osm">${osmAccount()}</div></div>`;
      bindBack(el);
      bindOsmAccount(draw);
      el.querySelectorAll("[data-set]").forEach(b => { b.onclick = () => { saveSetting(b.dataset.set, b.dataset.val); draw(); }; });
    };
    draw();
  }
};
