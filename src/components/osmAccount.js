// Home page row: connect to or leave OpenStreetMap.
import { $ } from "./dom.js";
import { OSM_PRACTICE } from "../data/config.js";
import { isLoggedIn, login, logout, osmReady, isDev, setPractice } from "../data/osmAuth.js";

export function osmAccount() {
  if (!osmReady()) return `<p class="mid" style="margin:0">OpenStreetMap editing is not set up yet.</p>`;
  const dev = isDev() ? `<button id="osmEnv" style="text-decoration:underline">${OSM_PRACTICE ? "Practice server: switch to real map" : "Real map: switch to practice server"}</button>` : "";
  return dev + (isLoggedIn()
    ? `<div class="row" style="align-items:center"><span class="tag">OpenStreetMap connected</span><button id="osmOut" style="text-decoration:underline">Log out</button></div>`
    : `<button class="big ghost" id="osmIn" style="min-height:48px">Connect OpenStreetMap</button>`);
}

export function bindOsmAccount(refresh) {
  const inBtn = $("#osmIn"), outBtn = $("#osmOut");
  if (inBtn) inBtn.onclick = login;
  if ($("#osmEnv")) $("#osmEnv").onclick = () => setPractice(!OSM_PRACTICE);
  if (outBtn) outBtn.onclick = () => { logout(); refresh(); };
}
