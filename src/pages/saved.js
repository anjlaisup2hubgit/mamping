// Confirmation after filming: Send to map or go home.
import { state } from "../data/state.js";
import { $ } from "../components/dom.js";
import { go } from "../components/router.js";

export const saved = {
  open(el) {
    const c = state.clip;
    el.innerHTML = `<div class="pad center">
      <div style="width:96px;height:96px;border-radius:50%;background:var(--acc);display:flex;align-items:center;justify-content:center"><svg width="52" height="52" viewBox="0 0 52 52"><path d="M12 27l10 10 18-22" stroke="var(--onacc)" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h2>Your video is saved</h2><p class="mid" style="margin:0">${c.secs}s · ${c.track.length ? "GPS tracked" : "no GPS"} · kept privately on this phone, then deleted once the building details are collected</p>
      <div style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:10px;margin-top:24px"><button class="big primary" id="toScan">Send to map</button><button class="big ghost" id="toHome">Back to home</button></div></div>`;
    $("#toScan").onclick = () => go("scan");
    $("#toHome").onclick = () => go("home");
  }
};
