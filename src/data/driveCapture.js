// Driving mode: instead of a video, takes one picture every 15 m, each with its own GPS point.
import { dist } from "./geo.js";

const GAP = 15, MAX_PICS = 400, BAD_GPS = 40; // metres, pictures (about 20 MB at most), metres

let watchId = null, timer = null, wake = null, pics = [], last = null, secs = 0, startedAt = 0;

function grab(video) {
  const c = document.createElement("canvas");
  c.width = 640; c.height = Math.round(video.videoHeight * 640 / Math.max(video.videoWidth, 1)) || 360;
  c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.6).split(",")[1];
}

export const isDriving = () => watchId != null;

export function startDrive(video, { onTick, onPic }) {
  pics = []; last = null; secs = 0; startedAt = Date.now();
  // keep the screen on, or the phone would lock and stop the camera mid-drive
  navigator.wakeLock?.request("screen").then(w => { wake = w; }).catch(() => {});
  watchId = navigator.geolocation.watchPosition(p => {
    const pt = { lat: p.coords.latitude, lng: p.coords.longitude };
    if (p.coords.accuracy > BAD_GPS || pics.length >= MAX_PICS || video.readyState < 2) return;
    if (last && dist(last.lat, last.lng, pt.lat, pt.lng) < GAP) return;
    last = pt;
    pics.push({ ...pt, img: grab(video) });
    onPic(pics.length, pt);
  }, () => {}, { enableHighAccuracy: true, maximumAge: 0 });
  timer = setInterval(() => onTick(++secs), 1000);
}

// Stops and returns the drive: its pictures and how long it lasted.
export function stopDrive() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  clearInterval(timer);
  if (wake) wake.release().catch(() => {});
  watchId = null; wake = null;
  return { id: startedAt, pics, secs: Math.max(secs, 1) };
}
