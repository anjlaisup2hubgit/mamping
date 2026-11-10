// Help: a short guide to filming a building.
import { header, bindBack } from "../components/header.js";

export const help = {
  open(el) {
    el.innerHTML = header("Help") + `<div class="pad scroll"><p><b>Quick tour</b></p>
      <p class="mid">1. Tap Take Video and walk past a building.<br>2. Tap the stop square.<br>3. Tap Send to map, check the name and height, then Upload now.</p>
      <p class="mid">Your video stays on this phone and is deleted once the building details are collected.</p>
      <p><b>Why this helps</b></p>
      <p class="mid">Your films help complete the map for your town, and the app is built light so it saves battery and data.</p>
      <p><b>How the AI is used</b></p>
      <p class="mid">The AI looks at a few pictures from your video and the nearby location, then suggests a building name and height.</p>
      <p class="mid">Every AI suggestion is only a guess, so please check it and fix it before you send.</p></div>`;
    bindBack(el);
  }
};
