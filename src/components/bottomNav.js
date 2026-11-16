// Shared Explore, contributions, videos and guide tabs.
import { go } from "./router.js";
import { icons } from "./icons.js";

const tabs = [["map", "Explore", icons.compass], ["edits", "My edits", icons.layers], ["videos", "Videos", icons.video], ["help", "Guide", icons.book]];

export const bottomNav = (active = "map") => `<nav class="nav workspaceNav" aria-label="Main">${tabs.map(([to, label, icon]) =>
  `<button class="navb${active === to ? " on" : ""}" data-to="${to}" ${active === to ? 'aria-current="page"' : ""}>${icon}<span>${label}</span></button>`).join("")}</nav>`;

export function bindNav(el) {
  el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
}
