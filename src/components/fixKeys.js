// Keyboard shortcuts for fixing a building (the list is in keyHelp.js). They only work while a building is being fixed,
// and never while typing in a box. Arrow keys move the outline here instead of tilting the map.
import { doFix } from "./fixActions.js";
import { moveBy } from "./cornerEditor.js";
import { focusedBox, currentBoxes, fixAt, unfocus } from "./missingLayer.js";
import { isReviewing } from "./reviewBar.js";
import { toggleHelp } from "./keyHelp.js";
import { closeSheet } from "./sheet.js";
import { state } from "../data/state.js";

const LETTERS = { q: "rect", a: "line", s: "street", e: "snap", c: "copy" };
const ARROWS = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

window.addEventListener("keydown", e => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.altKey) return;
  const k = e.key, ctrl = e.ctrlKey || e.metaKey, editing = !!focusedBox();
  const startTab = k === "Tab" && !editing && isReviewing() && currentBoxes().length; // Tab starts at the first building
  if (k === "?") return toggleHelp();
  if (!editing && !startTab) return;
  let run = null;
  if (ctrl) { if (["c", "d"].includes(k.toLowerCase()) && !getSelection().toString()) run = () => doFix("copy"); // duplicate this outline onto matching roofs
    else if (k.toLowerCase() === "y" || (e.shiftKey && k.toLowerCase() === "z")) run = () => doFix("redo"); }
  else if (k === "Tab") run = startTab ? () => fixAt(0) : () => doFix(e.shiftKey ? "prev" : "next");
  else if ((k === "Enter" && e.target.tagName !== "BUTTON") || k === "CapsLock") run = () => doFix("keep");
  else if (k === "Delete" || k === "Backspace" || k.toLowerCase() === "d") run = () => doFix("remove");
  else if (k === "Escape" && !state.drawing && !state.picking) run = () => { unfocus(); closeSheet(); };
  else if (ARROWS[k]) run = () => { const [x, y] = ARROWS[k], step = e.shiftKey ? 1.5 : 0.3; moveBy(x * step, y * step); };
  else if (k.toLowerCase() === "r") run = () => doFix(e.shiftKey ? "turnL" : "turnR", e.repeat); // holding R keeps turning
  else if (LETTERS[k.toLowerCase()]) run = () => doFix(LETTERS[k.toLowerCase()]);
  if (!run) return;
  e.preventDefault();
  e.stopImmediatePropagation(); // so the map's own arrow keys do not also tilt it
  run();
}, true);
