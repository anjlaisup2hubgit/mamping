// Camera: shows filming tips, waits for good GPS, then starts by itself; shows GPS, a mini map and live hints.
// Walking mode records a video of one building; Driving mode takes a picture every 15 m along the road.
import { state } from "../data/state.js";
import { HAI_PHONG } from "../data/config.js";
import { onMeMove } from "../data/location.js";
import { startCamera, startRecording, stopRecording, cancelCamera, isRecording } from "../data/recorder.js";
import { startDrive, stopDrive, isDriving } from "../data/driveCapture.js";
import { startChecks, stopChecks, askMotion, setDrivingChecks } from "../data/filmChecks.js";
import { getSettings, saveSetting } from "../data/settings.js";
import { $ } from "../components/dom.js";
import { go } from "../components/router.js";
import { createMiniMap } from "../components/miniMap.js";
import { toast } from "../components/toast.js";
import { showFilmTips, tipsSeen } from "../components/filmTips.js";

const GOOD_GPS = 30, ROOF_AT = 6, ENOUGH = 10, MAX = 60; // metres, seconds
const RING = 2 * Math.PI * 39; // length of the progress ring around the record button

let alive = false, mini = null, stopListening = null, waitGps = false, warn = "", hint = "", hintUntil = 0, driving = false, pics = 0;

const clock = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const gpsGood = () => state.me && state.me.acc <= GOOD_GPS;
const busy = () => isRecording() || isDriving();

// One message at a time: a problem to fix beats a short hint, which beats the GPS wait.
function showMsg() {
  const m = $("#camMsg");
  if (!m) return;
  const text = warn || (Date.now() < hintUntil ? hint : "") || (waitGps ? "Waiting for better GPS… or tap record to start anyway" : "");
  m.textContent = text;
  m.hidden = !text;
}

function flash(text, ms = 4000) {
  hint = text; hintUntil = Date.now() + ms;
  showMsg();
  setTimeout(showMsg, ms + 100);
}

function tick(s) {
  $("#tm").textContent = clock(s);
  $("#ring").style.strokeDashoffset = RING * (1 - Math.min(s / ENOUGH, 1));
  if (s === ROOF_AT) flash("Tilt up to show the roof");
  if (s === ENOUGH) { $("#recBtn").classList.add("enough"); flash("Enough footage — stop any time"); }
  if (s === MAX) { toast("Stopped at 1 minute to keep the file small."); end(); }
}

const driveTick = s => { $("#tm").textContent = clock(s) + " · " + pics + " pictures"; };

function begin() {
  if (busy()) return;
  waitGps = false;
  if (driving) { pics = 0; startDrive($("#v"), { onTick: driveTick, onPic: (n, p) => { pics = n; if (mini) mini.moveTo(p); } }); }
  else startRecording({ onTick: tick, onPoint: p => mini && mini.moveTo(p) });
  if (busy()) $("#page").classList.add("recording");
  $("#modeBtn").disabled = true;
  showMsg();
}

// Starts by itself once GPS is good enough to match the right building.
function autoStart() {
  if (!alive || busy()) return;
  if (gpsGood()) begin(); else { waitGps = true; showMsg(); }
}

async function end() {
  if (isDriving()) {
    state.drive = stopDrive();
    cancelCamera();
    return go("drive");
  }
  const clip = await stopRecording();
  if (!clip) return;
  state.clip = clip;
  go("saved");
}

function setMode(on) {
  driving = on;
  saveSetting("driveMode", on);
  setDrivingChecks(on);
  $("#modeBtn").textContent = on ? "🚗 Driving" : "🚶 Walking";
  $("#recBtn").classList.toggle("drive", on);
  if (on) flash("Mount the phone sideways. Don't touch it while driving.", 6000);
}

export const camera = {
  async open(el) {
    alive = true; waitGps = false; warn = ""; hintUntil = 0;
    el.classList.add("cam");
    el.innerHTML = `<video id="v" muted playsinline></video>
      <div class="top pad"><span class="chip" id="gpsChip">GPS searching</span><button class="chip" id="modeBtn" aria-label="Switch between walking and driving" data-tip="Walking / Driving"></button><span class="chip" id="tm">0:00</span></div>
      <button class="round" id="camBack" aria-label="Close" data-tip="Close" style="position:absolute;left:16px;top:72px;background:#000a;color:#fff;border:0">✕</button><div class="guide"></div>
      <div class="camMsg" id="camMsg" role="status" hidden></div>
      <div id="mini"></div>
      <div class="dock pad" style="align-items:center;flex-direction:row;justify-content:center"><button class="rec" id="recBtn" aria-label="Start or stop recording" data-tip="Record / Stop"><svg viewBox="0 0 84 84" aria-hidden="true"><circle id="ring" cx="42" cy="42" r="39" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></svg><i></i></button></div>`;
    stopListening = onMeMove(me => {
      $("#gpsChip").textContent = "GPS ±" + Math.round(me.acc || 0) + " m";
      $("#gpsChip").classList.toggle("bad", !gpsGood());
      if (waitGps && gpsGood()) begin();
    });
    $("#camBack").onclick = () => go("map");
    $("#modeBtn").onclick = () => setMode(!driving);
    $("#recBtn").onclick = () => { askMotion(); busy() ? end() : begin(); };
    setMode(!!getSettings().driveMode);
    try {
      await startCamera($("#v"));
    } catch (e) { toast("Camera blocked. Allow camera access in your browser."); go("map"); return; }
    if (!alive) return;
    mini = createMiniMap("mini", state.me ? [state.me.lat, state.me.lng] : HAI_PHONG);
    startChecks($("#v"), text => { warn = text; showMsg(); });
    if (tipsSeen()) setTimeout(autoStart, 500);
    else showFilmTips(el, () => { askMotion(); autoStart(); });
  },
  close() {
    alive = false; waitGps = false;
    if (stopListening) stopListening();
    if (isDriving()) stopDrive(); // leaving without stopping throws the pictures away
    stopChecks();
    cancelCamera();
    if (mini) { mini.destroy(); mini = null; }
  }
};
