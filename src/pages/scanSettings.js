// Scan options: how missing buildings are outlined, and your own Gemini key.
import { header, bindBack } from "../components/header.js";
import { aiSettings, bindAiSettings } from "../components/aiSettings.js";
import { saveSetting } from "../data/settings.js";
import { bottomNav, bindNav } from "../components/bottomNav.js";

export const scanSettings = {
  open(el) {
    const draw = () => {
      el.classList.add("hasWorkspaceNav");
      el.innerHTML = header("Scan options") + `<div class="pad scroll">${aiSettings()}</div>` + bottomNav("scanSettings");
      bindNav(el);
      bindBack(el, "settings");
      bindAiSettings(el);
      el.querySelectorAll("[data-set]").forEach(b => { b.onclick = () => { saveSetting(b.dataset.set, b.dataset.val); draw(); }; });
    };
    draw();
  }
};
