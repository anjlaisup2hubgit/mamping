// Home: the map with big Take Video button.
import { $ } from "../components/dom.js";
import { go } from "../components/router.js";
import { goMe, goHaiPhong } from "../components/mapView.js";
import { findMissing } from "../components/missingLayer.js";

export const home = {
  full: false,
  open(el) {
    el.innerHTML = `
      <div class="top pad"><h1>Hometown Map</h1>
        <div class="row"><button class="round" id="goHP" aria-label="Go to Hai Phong">HP</button><button class="round" id="goMe" aria-label="My location">◎</button><button class="round" id="openLib" aria-label="My videos">▤</button><button class="round" id="openHelp" aria-label="Help">?</button></div></div>
      <div class="dock pad"><button class="big primary" id="take">● Take Video</button>
        <div class="row"><button class="big ghost" id="openNear" style="min-height:52px">Nearby</button><button class="big ghost" id="findMiss" style="min-height:52px">Find missing</button></div></div>`;
    $("#goHP").onclick = goHaiPhong;
    $("#goMe").onclick = goMe;
    $("#openLib").onclick = () => go("library");
    $("#openHelp").onclick = () => go("help");
    $("#take").onclick = () => go("camera");
    $("#openNear").onclick = () => go("nearby");
    $("#findMiss").onclick = findMissing;
  }
};
