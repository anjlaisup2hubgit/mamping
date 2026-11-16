// Shared top navigation; guides and preferences live in Settings.
import { go } from "./router.js";
import { icons } from "./icons.js";

const tabs = [["map", "Explore"], ["edits", "My edits"], ["videos", "Videos"]];

export const bottomNav = (active = "map") => `<nav class="nav workspaceNav" aria-label="Main">${tabs.map(([to, label]) =>
  `<button class="navb${active === to ? " on" : ""}" data-to="${to}" ${active === to ? 'aria-current="page"' : ""}>${label}</button>`).join("")}<button class="navb settingsNav${active === "settings" ? " on" : ""}" id="settingsB" data-to="settings" aria-label="Settings" ${active === "settings" ? 'aria-current="page"' : ""}>${icons.settings}</button></nav>`;

export function bindNav(el) {
  el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
}
