// Help: a short guide to filming a building.
import { header, bindBack } from "../components/header.js";

export const help = {
  open(el) {
    el.innerHTML = header("Help") + `<div class="pad scroll"><h3 class="sec">Quick tour</h3>
      <p class="mid" style="margin:0 0 8px">1. Tap Take Video and walk past a building.<br>2. Tap the stop square.<br>3. Tap Send to map, check the name and height, then Upload now.</p>
      <p class="mid" style="margin:0 0 8px">Your video stays on this phone and is deleted once the building details are collected.</p>
      <h3 class="sec">Why this helps</h3>
      <p class="mid" style="margin:0 0 8px">Your films help complete the map for your town, and the app is built light so it saves battery and data.</p>
      <h3 class="sec">How the AI is used</h3>
      <p class="mid" style="margin:0 0 8px">The AI looks at a few pictures from your video and the nearby location, then suggests a building name and height.</p>
      <p class="mid" style="margin:0 0 8px">Every AI suggestion is only a guess, so please check it and fix it before you send.</p></div>`;
    bindBack(el);
  }
};
