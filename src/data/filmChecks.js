// Watches the phone while filming and says what to fix: held upright, too dark, pointed away, or moving too fast.
let video = null, timer = null, gravity = null, shake = 0, ctx = null, driving = false;

function onMotion(e) {
  const g = e.accelerationIncludingGravity;
  if (g && g.x != null) gravity = g;
  const a = e.acceleration; // movement without gravity, smoothed so one bump doesn't trigger a warning
  if (a && a.x != null) shake = shake * 0.9 + Math.hypot(a.x, a.y, a.z) * 0.1;
}

// Average brightness of the camera picture, 0 (black) to 255 (white).
function brightness() {
  if (!video || video.readyState < 2) return 255;
  if (!ctx) { const c = document.createElement("canvas"); c.width = c.height = 16; ctx = c.getContext("2d", { willReadFrequently: true }); }
  ctx.drawImage(video, 0, 0, 16, 16);
  const px = ctx.getImageData(0, 0, 16, 16).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
  return sum / (px.length / 4);
}

// The most important problem right now, or "" if all is fine.
function problem() {
  const g = gravity;
  const upright = g ? Math.abs(g.y) > Math.abs(g.x) && Math.abs(g.y) > Math.abs(g.z) : innerHeight > innerWidth;
  if (upright) return "Turn the phone sideways";
  if (brightness() < 40) return "Too dark — film in daylight";
  if (g && Math.abs(g.z) > 7.5) return "Point the phone at the building";
  if (!driving && shake > 2.5) return "Walk slower and hold steady"; // a moving car always shakes
  return "";
}

// iPhones only share motion after a tap, so call this from a button press.
export function askMotion() {
  if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().catch(() => {});
}

export function startChecks(videoEl, onWarn) {
  video = videoEl;
  window.addEventListener("devicemotion", onMotion);
  timer = setInterval(() => onWarn(problem()), 1000);
}

export const setDrivingChecks = on => { driving = on; };

export function stopChecks() {
  clearInterval(timer);
  window.removeEventListener("devicemotion", onMotion);
  video = null; gravity = null; shake = 0;
}
