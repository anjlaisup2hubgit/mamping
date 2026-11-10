// Title bar with a back button, used by most pages.
import { go } from "./router.js";

export const header = title =>
  `<div class="head pad"><button class="round" data-back aria-label="Back" data-tip="Back">←</button><h2>${title}</h2><span style="width:44px"></span></div>`;

export function bindBack(el, to = "map") {
  el.querySelectorAll("[data-back]").forEach(b => { b.onclick = () => go(to); });
}
