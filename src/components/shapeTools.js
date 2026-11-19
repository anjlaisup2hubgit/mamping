// Edit mode tools, laid out like a photo editor: a building switcher at the top left and a tool rail down the right side.
import { watchShape } from "./cornerEditor.js";
import { boxPosition, unfocus, drawYourself, focusedBox, fixAt, currentBoxes, findMissing } from "./missingLayer.js";
import { doFix } from "./fixActions.js";
import { toggleSelect } from "./reviewBar.js";
import { fitEditingView } from "./mapView.js";
import { closeSheet } from "./sheet.js";
import { editIcons as i } from "./editIcons.js";
import { makeDraggable } from "./dragPanel.js";
import { toggleHelp } from "./keyHelp.js";
import { stopDrawing } from "./drawBuilding.js";
import "./fixKeys.js";
import { sizeText } from "../data/shapeMoves.js";

const tool = (act, title, icon, key) => `<button data-act="${act}" aria-label="${title}" data-tip="${key ? `${title} (${key})` : title}">${icon}<span>${title}</span></button>`;
const railHtml = `<div class="railGrip" title="Drag to move · double-click to put back">${i.grip}</div>
  ${tool("select", "Select", i.select)}${tool("draw", "Draw box", i.draw)}${tool("scan", "AI scan", i.scan)}<hr>
  ${tool("rect", "Square", i.square, "Q")}${tool("line", "Line up", i.lineUp, "A")}${tool("street", "Street", i.street, "S")}${tool("snap", "Snap to roof", i.snap, "E")}
  ${tool("copy", "Copy", i.copy, "Ctrl+D")}
  <hr>${tool("undo", "Undo", i.undo, "Ctrl+Z")}${tool("redo", "Redo", i.redo, "Ctrl+Y")}${tool("keys", "Keyboard shortcuts", i.help, "?")}`;
const switchHtml = `<button data-act="prev" aria-label="Previous building">${i.prev}</button>
  <span class="fixCount"><b></b><small></small></span>
  <button data-act="next" aria-label="Next building">${i.next}</button>
  <button class="switchX" aria-label="Stop editing">${i.close}</button>`;
let rail = null, switcher = null, selected = null, observer = null, fitting = false, glide = false;

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
      else if (act === "draw") drawYourself();
      else if (act === "scan") { stopDrawing(); unfocus(); closeSheet(); findMissing(); }
      else if (act === "keys") toggleHelp();
      else if ((act === "next" || act === "prev") && !focusedBox()) fixAt(act === "next" ? 0 : -1); // nothing picked yet: start from either end
      else if (act) doFix(act);
    });
  });
  switcher.querySelector(".switchX").onclick = leaveEditMode;
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

// The Edits button: shows the tools without picking a building, so the map stays where it is until an arrow is tapped.
export function showIdleTools() {
  if (!rail) build();
  document.body.classList.add("editMode");
  showModeName();
}
const showModeName = () => {
  switcher.querySelector(".fixCount b").textContent = "Edit mode";
  switcher.querySelector(".fixCount small").textContent = `${currentBoxes().length} buildings`;
};

// The switcher's X: closes the editor and its tools.
export function leaveEditMode() {
  stopDrawing(); unfocus(); closeSheet();
  document.body.classList.remove("editMode", "editingOutline", "selectingMany");
}

watchShape(b => {
  const changed = selected !== b;
  selected = b;
  document.body.classList.toggle("editingOutline", !!b);
  if (!b) {
    if (observer) observer.disconnect();
    if (switcher) showModeName();
    return;
  }
  if (!rail) build();
  const { i: at, n } = boxPosition();
  switcher.querySelector(".fixCount b").textContent = `Building ${at + 1} of ${n}`;
  switcher.querySelector(".fixCount small").textContent = sizeText(b.coords);
  if (changed) placeEditor(true);
});
