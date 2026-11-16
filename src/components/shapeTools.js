// Edit mode tools, laid out like a photo editor: a building switcher at the top left and a tool rail down the right side.
import { watchShape } from "./cornerEditor.js";
import { boxPosition, unfocus } from "./missingLayer.js";
import { doFix } from "./fixActions.js";
import { toggleSelect } from "./reviewBar.js";
import { fitEditingView } from "./mapView.js";
import { closeSheet } from "./sheet.js";
import { editIcons as i } from "./editIcons.js";
import { makeDraggable } from "./dragPanel.js";
import "./fixKeys.js";
import { sizeText } from "../data/shapeMoves.js";

const tool = (act, title, icon, key) => `<button data-act="${act}" aria-label="${title}" data-tip="${key ? `${title} (${key})` : title}">${icon}<span>${title}</span></button>`;
const railHtml = `<div class="railGrip" title="Drag to move · double-click to put back">${i.grip}</div>
  ${tool("select", "Select", i.select)}<hr>
  ${tool("rect", "Square", i.square, "Q")}${tool("line", "Line up", i.lineUp, "A")}${tool("street", "Street", i.street, "S")}
  ${tool("turnL", "Turn left", i.turnLeft, "Shift+R")}${tool("turnR", "Turn right", i.turnRight, "R")}${tool("copy", "Copy", i.copy, "Ctrl+D")}
  <hr>${tool("undo", "Undo", i.undo, "Ctrl+Z")}${tool("redo", "Redo", i.redo, "Ctrl+Y")}`;
const switchHtml = `<button data-act="prev" aria-label="Previous building">${i.prev}</button>
  <span class="fixCount"><b></b><small></small></span>
  <button data-act="next" aria-label="Next building">${i.next}</button>
  <button class="switchX" aria-label="Stop editing">${i.close}</button>`;
let rail = null, switcher = null, repeat = null, selected = null, observer = null, fitting = false, glide = false;
const stopRepeat = () => { clearTimeout(repeat); clearInterval(repeat); repeat = null; };

export function placeEditor(newBuilding = false) {
  glide ||= newBuilding === true; // glide only when moving to another building
  const view = window.visualViewport;
  document.documentElement.style.setProperty("--editor-height", `${view?.height || innerHeight}px`);
  document.documentElement.style.setProperty("--keyboard-bottom", `${Math.max(0, innerHeight - (view?.height || innerHeight) - (view?.offsetTop || 0))}px`);
  if (fitting) return;
  fitting = true;
  requestAnimationFrame(() => { fitting = false; if (selected && document.querySelector("#bsheet.editorSheet.on")) fitEditingView(selected.coords, glide); glide = false; });
}

function build() {
  rail = document.createElement("div");
  rail.className = "editRail";
  rail.innerHTML = railHtml;
  switcher = document.createElement("div");
  switcher.className = "editSwitch";
  switcher.innerHTML = switchHtml;
  [rail, switcher].forEach(el => {
    document.body.appendChild(el);
    el.addEventListener("click", e => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "select") toggleSelect();
      else if (act && !act.startsWith("turn")) doFix(act);
    });
  });
  rail.addEventListener("pointerdown", e => { // holding a turn button keeps turning
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act?.startsWith("turn")) return;
    doFix(act);
    repeat = setTimeout(() => { repeat = setInterval(() => doFix(act, true), 80); }, 400);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach(type => rail.addEventListener(type, stopRepeat));
  switcher.querySelector(".switchX").onclick = () => { unfocus(); closeSheet(); };
  makeDraggable(rail, rail.querySelector(".railGrip"));
  window.addEventListener("resize", placeEditor);
  window.visualViewport?.addEventListener("resize", placeEditor);
  window.visualViewport?.addEventListener("scroll", placeEditor);
}

// Called each time a building's bottom bar opens.
export function mountShapeTools() {
  if (!rail) build();
  if (observer) observer.disconnect();
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(placeEditor);
    observer.observe(document.querySelector("#bsheet"));
  }
  placeEditor();
}

watchShape(b => {
  const changed = selected !== b;
  selected = b;
  document.body.classList.toggle("editingOutline", !!b);
  if (!b) {
    stopRepeat();
    if (observer) observer.disconnect();
    return;
  }
  if (!rail) build();
  const { i: at, n } = boxPosition();
  switcher.querySelector(".fixCount b").textContent = `Building ${at + 1} of ${n}`;
  switcher.querySelector(".fixCount small").textContent = sizeText(b.coords);
  if (changed) placeEditor(true);
});
