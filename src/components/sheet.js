// The panel that slides up from the bottom of the map.
import { $ } from "./dom.js";

export function openSheet(html) {
  const s = $("#bsheet");
  s.innerHTML = html + '<button class="x" aria-label="Close panel">✕</button>';
  s.querySelector(".x").onclick = closeSheet;
  s.classList.add("on");
}
export const closeSheet = () => $("#bsheet").classList.remove("on");
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); }); // Esc closes the panel
