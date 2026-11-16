// Help: a short guide to filming a building.
import { header, bindBack } from "../components/header.js";
import { FILM_TIPS } from "../components/filmTips.js";
import { neighbourhoodArt } from "../components/neighbourhoodArt.js";
import { icons } from "../components/icons.js";
import { go } from "../components/router.js";

export const help = {
  open(el) {
    el.innerHTML = header("Guide") + `<div class="pad scroll"><div class="guideHero">${neighbourhoodArt()}<div><h2>How to contribute</h2></div></div>
      <div class="guideSteps"><div class="guideStep">${icons.camera}<h3>1. Capture</h3><p>Walk past a building, keep the roof in frame, then tap stop.</p></div><div class="guideStep">${icons.building}<h3>2. Check</h3><p>Review the suggested name, floors and height. Correct anything that looks wrong.</p></div><div class="guideStep">${icons.layers}<h3>3. Contribute</h3><p>Keep details on your device or choose to add them to the map.</p></div></div>
      <p class="mid" style="margin:0 0 8px">Your video stays on this phone and is deleted once the building details are collected.</p>
      <h3 class="sec">Filming tips</h3>
      <ol class="mid" style="margin:0 0 8px;padding-left:20px">${FILM_TIPS.map(t => `<li>${t}</li>`).join("")}</ol>
      <h3 class="sec">How the AI is used</h3>
      <p class="mid" style="margin:0 0 8px">The AI looks at a few pictures from your video and the nearby location, then suggests a building name and height.</p>
      <p class="mid" style="margin:0 0 8px">Every AI suggestion is only a guess, so please check it and fix it before you send.</p><button class="big ghost" id="outlineGuide">Explore the outline-editing guide</button></div>`;
    bindBack(el, "settings");
    el.querySelector("#outlineGuide").onclick = () => go("fixGuide");
  }
};
