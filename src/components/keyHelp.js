// The "?" list of keyboard shortcuts for fixing buildings. Tap it (or press ? or Esc) to close.
import { $ } from "./dom.js";

export const KEYS = [
  ["Q", "Square the corners"], ["A", "Line up with the road"], ["S", "Choose a street to line up with"],
  ["R / Shift+R", "Turn 1° right / left"], ["Arrows", "Move a tiny step (Shift = bigger)"],
  ["Tab / Shift+Tab", "Next / previous building"], ["Enter", "Keep, go to the next"], ["Delete", "Remove"],
  ["C / Ctrl+C / Ctrl+D", "Duplicate onto matching roofs"], ["Ctrl+Z / Ctrl+Y", "Undo / redo"], ["Esc", "Stop fixing"], ["?", "Show this list"]
];

let panel = null;

export function toggleHelp() {
  if (panel) { panel.remove(); panel = null; return; }
  panel = document.createElement("div");
  panel.className = "keyHelp";
  panel.innerHTML = `<h3>Keyboard shortcuts</h3>${KEYS.map(([k, t]) => `<div><kbd>${k}</kbd><span>${t}</span></div>`).join("")}`;
  panel.onclick = toggleHelp;
  $("#bsheet").parentElement.appendChild(panel);
}
