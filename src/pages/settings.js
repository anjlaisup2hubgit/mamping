// Settings: your videos and scanned outlines, your edits, AI choices and OpenStreetMap login.
import { header, bindBack } from "../components/header.js";
import { osmAccount, bindOsmAccount } from "../components/osmAccount.js";
import { aiSettings, bindAiSettings } from "../components/aiSettings.js";
import { editHistory, bindEditHistory } from "../components/editHistory.js";
import { go } from "../components/router.js";
import { saveSetting } from "../data/settings.js";

const page = () => `<div class="pad"><h3 class="sec">Saved for later</h3>
  <button class="opt" data-to="videos">Recorded videos</button>
  <button class="opt" data-to="outlines">Scanned outlines</button>
  <h3 class="sec">Your edits</h3><div id="edits" style="display:flex;flex-direction:column;gap:8px"></div>
  ${aiSettings()}<h3 class="sec">Login</h3><div id="osm">${osmAccount()}</div>
  <h3 class="sec">Help</h3><button class="opt" data-to="help">How to use Mamping</button></div>`;

export const settings = {
  open(el) {
    const draw = () => {
      const keep = el.querySelector(".scroll")?.scrollTop || 0; // redrawing would otherwise jump back to the top
      el.innerHTML = header("Settings") + `<div class="scroll">${page()}</div>`;
      el.querySelector(".scroll").scrollTop = keep;
      bindBack(el);
      const drawEdits = () => { const e = el.querySelector("#edits"); e.innerHTML = editHistory(); bindEditHistory(e, drawEdits); };
      drawEdits();
      el.querySelectorAll("[data-to]").forEach(b => { b.onclick = () => go(b.dataset.to); });
      bindAiSettings(el);
      bindOsmAccount(draw);
      el.querySelectorAll("[data-set]").forEach(b => { b.onclick = () => { saveSetting(b.dataset.set, b.dataset.val); draw(); }; });
    };
    draw();
  }
};
