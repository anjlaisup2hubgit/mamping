// The fix bar: every tool for the building being fixed, with words under the icons.
// On a phone it sits above the bottom panel, in thumb reach; on a computer it sits at the top right.
// Turn buttons keep turning while held. It goes away when editing stops.
import { $ } from "./dom.js";
import { watchShape } from "./cornerEditor.js";
import { boxPosition } from "./missingLayer.js";
import { doFix } from "./fixActions.js";
import "./fixKeys.js"; // the keyboard shortcuts for the same actions
import { sizeText } from "../data/shapeMoves.js";

const icon = path => `<svg viewBox="0 0 24 24">${path}</svg>`;
const TOOLS = [
  ["rect", "Square", '<rect x="4" y="7" width="16" height="10" rx="1.5"/>'],
  ["line", "Line up", '<path d="M8 3L5 21M16 3l3 18"/><path d="M12 5v2M12 11v2M12 17v2"/>'],
  ["street", "Street", '<path d="M3 20L20 4"/><path d="M13 4h7v7"/>'],
  ["turnL", "Turn", '<path d="M5 12a7 7 0 107-7"/><path d="M5 4v5h5"/>'],
  ["turnR", "Turn", '<path d="M19 12a7 7 0 11-7-7"/><path d="M19 4v5h-5"/>'],
  ["undo", "Undo", '<path d="M9 5L4 10l5 5"/><path d="M4 10h11a5 5 0 010 10h-4"/>'],
  ["redo", "Redo", '<path d="M15 5l5 5-5 5"/><path d="M20 10H9a5 5 0 000 10h4"/>'],
  ["copy", "Copy", '<rect x="4" y="8" width="12" height="12" rx="1.5"/><path d="M8 8V4h12v12h-4"/>'],
  ["remove", "Remove", '<path d="M6 6l12 12M18 6L6 18"/>'],
  ["keep", "Keep", '<path d="M5 12l5 5 9-10"/>']
];
const html = `<div class="fixHead"><button data-act="prev" aria-label="Previous building">${icon('<path d="M15 6l-6 6 6 6"/>')}</button>
    <span class="fixCount"></span><button data-act="next" aria-label="Next building">${icon('<path d="M9 6l6 6-6 6"/>')}</button></div>
  <div class="fixGrid">${TOOLS.map(([a, t, p]) => `<button data-act="${a}"${a === "keep" ? ' class="go"' : ""} aria-label="${t}">${icon(p)}<span>${t}</span></button>`).join("")}</div>`;

let bar = null, repeat = null;

const stopRepeat = () => { clearTimeout(repeat); clearInterval(repeat); repeat = null; };

function build() {
  bar = document.createElement("div");
  bar.className = "fixBar";
  bar.innerHTML = html;
  $("#bsheet").parentElement.appendChild(bar);
  bar.addEventListener("click", e => { const a = e.target.closest("[data-act]")?.dataset.act; if (a && !a.startsWith("turn")) doFix(a); });
  bar.addEventListener("pointerdown", e => { // holding a turn button keeps turning
    const a = e.target.closest("[data-act]")?.dataset.act;
    if (!a || !a.startsWith("turn")) return;
    doFix(a);
    repeat = setTimeout(() => { repeat = setInterval(() => doFix(a, true), 80); }, 400);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach(t => bar.addEventListener(t, stopRepeat));
  window.addEventListener("resize", place);
}

// Sits just above the bottom panel on a phone (the panel's height changes), so measure it after it has opened.
function place() {
  if (!bar) return;
  const sheet = $("#bsheet");
  bar.style.bottom = `${(sheet.classList.contains("on") ? sheet.offsetHeight : 0) + 20}px`;
}

watchShape(b => {
  if (!bar) { if (!b) return; build(); }
  bar.classList.toggle("on", !!b);
  if (!b) return stopRepeat();
  const { i, n } = boxPosition();
  bar.querySelector(".fixCount").textContent = `${i + 1} of ${n} · ${sizeText(b.coords)}`;
  setTimeout(place, 0);
});
