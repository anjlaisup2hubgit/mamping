// The panel that slides up from the bottom of the map.
import { $ } from "./dom.js";

// bar = true shows it as one short row at the bottom, so the map stays visible.
export function openSheet(html, bar = false) {
  const s = $("#bsheet");
  s.classList.toggle("barSheet", bar);
  s.innerHTML = html + '<button class="x" aria-label="Close panel">✕</button>';
  s.querySelector(".x").onclick = closeSheet;
  s.classList.add("on");
}
export const closeSheet = () => $("#bsheet").classList.remove("on");
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); }); // Esc closes the panel
