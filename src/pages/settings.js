// Settings screen with two tabs: Home (your videos) and Settings (AI and OpenStreetMap login).
import { header, bindBack } from "../components/header.js";
import { osmAccount, bindOsmAccount } from "../components/osmAccount.js";
import { aiSettings, bindAiSettings } from "../components/aiSettings.js";
import { homeTab, fillHomeTab } from "../components/homeTab.js";
import { go } from "../components/router.js";
import { saveSetting } from "../data/settings.js";

const TABS = [["home", "Home"], ["settings", "Settings"]];
let tab = "home";

const settingsTab = () => `<div class="pad">${aiSettings()}<p><b>Login</b></p><div id="osm">${osmAccount()}</div>
  <p><b>Help</b></p><button class="opt" id="openHelp">How to use Mamping</button></div>`;

export const settings = {
  open(el) {
    const draw = () => {
      const keep = el.querySelector(".scroll")?.scrollTop || 0; // redrawing would otherwise jump back to the top
      el.innerHTML = header("Settings") + `<div class="tabs">${TABS.map(([v, t]) => `<button class="${tab === v ? "on" : ""}" data-tab="${v}">${t}</button>`).join("")}</div>
        <div class="scroll">${tab === "home" ? homeTab() : settingsTab()}</div>`;
      el.querySelector(".scroll").scrollTop = keep;
      bindBack(el);
      el.querySelectorAll("[data-tab]").forEach(b => { b.onclick = () => { tab = b.dataset.tab; draw(); }; });
      if (tab === "home") return fillHomeTab(el);
      el.querySelector("#openHelp").onclick = () => go("help");
      bindAiSettings(el);
      bindOsmAccount(draw);
      el.querySelectorAll("[data-set]").forEach(b => { b.onclick = () => { saveSetting(b.dataset.set, b.dataset.val); draw(); }; });
    };
    draw();
  }
};
