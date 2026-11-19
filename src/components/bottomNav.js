// Shared bottom navigation: one floating bar in the same place on every page, with Capture in the middle.
import { go } from "./router.js";
import { icons } from "./icons.js";

const tabs = [["map", "Map", icons.compass], ["edits", "Edits", icons.edit], ["camera", "", icons.camera], ["videos", "Videos", icons.video], ["settings", "Settings", icons.settings]];

export const bottomNav = (active = "map") => `<nav class="nav workspaceNav" aria-label="Main">${tabs.map(([to, label, icon]) => to === "camera"
  ? `<button class="navb navCapture" data-to="camera" id="navCam" aria-label="Capture a building" data-tip="Capture a building">${icon}</button>`
  : `<button class="navb${active === to ? " on" : ""}" data-to="${to}" aria-label="${label}" data-tip="${label}" ${active === to ? 'aria-current="page"' : ""}>${icon}</button>`).join("")}</nav>`; // icon only; the name shows on hover

export function bindNav(el) {
  // Edits stays on the map and opens the editing tools there; My edits is in Settings.
  // reviewBar is loaded on tap, because loading it with this file starts the editor files in the wrong order.
  const edit = () => go("map").then(() => import("./reviewBar.js")).then(m => m.startEditing());
  // Only the bottom bar's Edits opens the editor; Settings' "My edits" row (also data-to="edits") opens the My edits page.
  el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => b.dataset.to === "edits" && b.closest(".workspaceNav") ? edit() : go(b.dataset.to); });
}
