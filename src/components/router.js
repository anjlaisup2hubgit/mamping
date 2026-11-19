// Switches between pages. A page is {full, open(el, arg), close()}, or a function that loads one.
import { $ } from "./dom.js";
import { bottomNav, bindNav } from "./bottomNav.js";
import { closeSheet } from "./sheet.js";

const pages = {};
let current = null;

export const register = list => Object.assign(pages, list);

export async function go(name, arg) {
  if (typeof pages[name] === "function") pages[name] = await pages[name](); // load the page the first time
  if (current && current.close) current.close();
  if (name !== "map") leaveEditor();
  current = pages[name];
  const el = $("#page");
  el.innerHTML = "";
  el.className = current.full === false ? "" : "full";
  document.body.dataset.page = name;
  current.open(el, arg);
  if (["edits", "videos", "help", "settings", "outlines", "fixGuide"].includes(name)) {
    el.classList.add("hasWorkspaceNav");
    el.insertAdjacentHTML("beforeend", bottomNav(name));
    bindNav(el);
  }
}

// Leaving the map closes the building editor, so its tool rail and top bar do not float over other pages.
function leaveEditor() {
  const body = document.body.classList;
  if (!body.contains("editingOutline") && !body.contains("selectingMany") && !body.contains("editMode")) return;
  import("./reviewBar.js").then(m => { m.stopReview(); closeSheet(); body.remove("editingOutline", "selectingMany", "editMode"); });
}
