// One compact editor: navigation and common actions stay visible; extra shape tools expand when needed.
import { watchShape } from "./cornerEditor.js";
import { boxPosition } from "./missingLayer.js";
import { doFix } from "./fixActions.js";
import { fitEditingView } from "./mapView.js";
import "./fixKeys.js";
import { sizeText } from "../data/shapeMoves.js";

const tool = (name, title, symbol, cls = "") => `<button data-act="${name}" class="${cls}" aria-label="${title}">${symbol}<span>${title}</span></button>`;
const html = `<div class="fixHead"><button data-act="prev" aria-label="Previous building">‹</button><span class="fixCount"></span><button data-act="next" aria-label="Next building">›</button></div>
  <div class="editorCommon">${tool("rect", "Square", "□")}${tool("undo", "Undo", "↶")}${tool("keep", "Check and next", "✓", "go")}</div>
  <details class="editorAdvanced"><summary>More shape tools</summary><div class="fixGrid">
    ${tool("line", "Line up", "⇥")}${tool("street", "Pick street", "↗")}${tool("turnL", "Turn left", "↶")}${tool("turnR", "Turn right", "↷")}${tool("redo", "Redo", "↷")}${tool("copy", "Copy", "▣")}${tool("remove", "Remove", "×")}
  </div></details>`;
let bar = null, repeat = null, selected = null, observer = null, fitting = false;
const stopRepeat = () => { clearTimeout(repeat); clearInterval(repeat); repeat = null; };

export function placeEditor() {
  const view = window.visualViewport;
  document.documentElement.style.setProperty("--editor-height", `${view?.height || innerHeight}px`);
  document.documentElement.style.setProperty("--keyboard-bottom", `${Math.max(0, innerHeight - (view?.height || innerHeight) - (view?.offsetTop || 0))}px`);
  if (fitting) return;
  fitting = true;
  requestAnimationFrame(() => { fitting = false; if (selected && document.querySelector("#bsheet.editorSheet.on")) fitEditingView(selected.coords); });
}

function build() {
  bar = document.createElement("div");
  bar.className = "fixBar";
  bar.innerHTML = html;
  bar.addEventListener("click", e => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act && !act.startsWith("turn")) doFix(act);
  });
  bar.addEventListener("pointerdown", e => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act?.startsWith("turn")) return;
    doFix(act);
    repeat = setTimeout(() => { repeat = setInterval(() => doFix(act, true), 80); }, 400);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach(type => bar.addEventListener(type, stopRepeat));
  bar.querySelector("details").addEventListener("toggle", placeEditor);
  window.addEventListener("resize", placeEditor);
  window.visualViewport?.addEventListener("resize", placeEditor);
  window.visualViewport?.addEventListener("scroll", placeEditor);
}

// openSheet replaces its contents, so move the same tool bar into each new building inspector.
export function mountShapeTools(container) {
  if (!bar) build();
  container.appendChild(bar);
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
  if (!bar) build();
  const { i, n } = boxPosition();
  bar.querySelector(".fixCount").textContent = `${i + 1} of ${n} · ${sizeText(b.coords)}`;
  if (changed) placeEditor();
});
