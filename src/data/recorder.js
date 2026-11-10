// Camera and video recording, with the GPS path walked while filming.
import { state } from "./state.js";
import { saveClip } from "./store.js";

let stream = null, rec = null, chunks = [], track = [], timer = null, secs = 0, watchId = null, finish = null;

export const isRecording = () => !!rec;

export async function startCamera(videoEl) {
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } }, audio: true });
  videoEl.srcObject = stream;
  await videoEl.play();
}

function stopTimers() {
  clearInterval(timer);
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

export function startRecording({ onTick, onPoint }) {
  if (rec || !stream) return;
  chunks = []; track = []; secs = 0;
  const mime = ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
  rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 1500000, audioBitsPerSecond: 64000 }); // small files for weak phones
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = () => finish && finish();
  rec.start(1000);
  watchId = navigator.geolocation.watchPosition(p => {
    const pt = { lat: p.coords.latitude, lng: p.coords.longitude, t: Date.now() };
    track.push(pt); onPoint(pt);
  }, () => {}, { enableHighAccuracy: true });
  timer = setInterval(() => { secs++; onTick(secs); }, 1000);
}

// Stops recording, saves the clip on the phone, and returns it.
export function stopRecording() {
  return new Promise(ok => {
    if (!rec) return ok(null);
    stopTimers();
    finish = async () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
      rec = null; finish = null;
      closeCamera();
      if (!track.length && state.me) track.push({ lat: state.me.lat, lng: state.me.lng, t: Date.now() });
      const clip = {
        id: Date.now(), blob, secs: Math.max(secs, 1), track, at: new Date().toLocaleString(),
        sent: false, buildingId: null, name: "", height: null, comment: "", photo: null
      };
      try { await saveClip(clip); } catch (e) { clip.notSaved = true; }
      ok(clip);
    };
    rec.stop();
  });
}

export function closeCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

// Leave without keeping anything.
export function cancelCamera() {
  stopTimers();
  if (rec) { rec.onstop = null; rec.stop(); rec = null; }
  finish = null;
  closeCamera();
}
