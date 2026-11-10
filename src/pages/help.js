// Help: a short guide to filming a building.
import { header, bindBack } from "../components/header.js";

export const help = {
  open(el) {
    el.innerHTML = header("Help") + `<div class="pad scroll"><p><b>Quick tour</b></p>
      <p class="mid">1. Tap Take Video and walk past a building.<br>2. Tap the stop square.<br>3. Tap Send to map, check the name and height, then Upload now.</p>
      <p class="mid">Your videos stay on this phone until you upload them.</p></div>`;
    bindBack(el);
  }
};
