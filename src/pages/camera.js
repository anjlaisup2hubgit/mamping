// Camera: starts recording by itself, shows GPS and a mini map.
import { state } from "../data/state.js";
import { HAI_PHONG } from "../data/config.js";
import { onMeMove } from "../data/location.js";
import { startCamera, startRecording, stopRecording, cancelCamera, isRecording } from "../data/recorder.js";
import { $ } from "../components/dom.js";
import { go } from "../components/router.js";
import { createMiniMap } from "../components/miniMap.js";
import { toast } from "../components/toast.js";

let alive = false, mini = null, stopListening = null;

const clock = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

function begin() {
  startRecording({ onTick: s => { $("#tm").textContent = clock(s); }, onPoint: p => mini && mini.moveTo(p) });
  if (isRecording()) $("#page").classList.add("recording");
}

async function end() {
  const clip = await stopRecording();
  if (!clip) return;
  state.clip = clip;
  go("saved");
}

export const camera = {
  async open(el) {
    alive = true;
    el.classList.add("cam");
    el.innerHTML = `<video id="v" muted playsinline></video>
      <div class="top pad"><span class="chip" id="gpsChip">GPS searching</span><span class="chip" id="tm">0:00</span></div>
      <button class="chip" id="camBack" style="position:absolute;left:16px;top:72px">← Back</button>
      <div id="mini"></div>
      <div class="dock pad" style="align-items:center;flex-direction:row;justify-content:center"><button class="rec" id="recBtn" aria-label="Start or stop recording"><i></i></button></div>
      <button id="stopbtn" aria-label="Stop"></button>`;
    stopListening = onMeMove(me => { $("#gpsChip").textContent = "GPS ±" + Math.round(me.acc || 0) + " m"; });
    $("#camBack").onclick = () => go("home");
    $("#recBtn").onclick = () => (isRecording() ? end() : begin());
    $("#stopbtn").onclick = end;
    try {
      await startCamera($("#v"));
    } catch (e) { toast("Camera blocked. Allow camera access in your browser."); go("home"); return; }
    if (!alive) return;
    mini = createMiniMap("mini", state.me ? [state.me.lat, state.me.lng] : HAI_PHONG);
    setTimeout(() => { if (alive && !isRecording()) begin(); }, 500); // starts automatically
  },
  close() {
    alive = false;
    if (stopListening) stopListening();
    cancelCamera();
    if (mini) { mini.destroy(); mini = null; }
  }
};
