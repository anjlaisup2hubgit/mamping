// The panel that slides up from the bottom of the map.
import { $ } from "./dom.js";

export function openSheet(html) {
  const s = $("#bsheet");
  s.innerHTML = html;
  s.classList.add("on");
}
export const closeSheet = () => $("#bsheet").classList.remove("on");
