// Title bar with a back button, used by most pages.
import { go } from "./router.js";
import { icons } from "./icons.js";

export const header = title =>
  `<header class="head pad"><button class="round" data-back aria-label="Back" data-tip="Back">←</button><div class="pageHeading"><span class="eyebrow">Mamping · Your neighbourhood</span><h2>${title}</h2></div><button class="round" data-workspace aria-label="Your workspace">${icons.person}</button></header>`;

export function bindBack(el, to = "map") {
  el.querySelectorAll("[data-back]").forEach(b => { b.onclick = () => go(to); });
  el.querySelectorAll("[data-workspace]").forEach(b => { b.onclick = () => go("settings"); });
}
