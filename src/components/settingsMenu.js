// Small popup above the bottom bar: opens from the settings icon, closes when you tap elsewhere.
import { $ } from "./dom.js";
import { go } from "./router.js";

export const settingsMenu = () => `<div class="menu" id="menu"><button data-to="settings">Settings</button><button data-to="help">How to use Mamping</button></div>`;

export function bindSettingsMenu() {
  const menu = $("#menu");
  $("#settingsB").onclick = () => menu.classList.toggle("open");
  menu.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
  const closeOutside = e => {
    if (!$("#menu")) { document.removeEventListener("pointerdown", closeOutside); return; }
    if (!e.target.closest("#menu, #settingsB")) $("#menu").classList.remove("open");
  };
  document.addEventListener("pointerdown", closeOutside);
}
