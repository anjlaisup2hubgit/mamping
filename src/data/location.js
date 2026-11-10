// Follows the phone's GPS and tells listeners when it moves.
import { state } from "./state.js";

const listeners = new Set();

export function onMeMove(fn) {
  listeners.add(fn);
  if (state.me) fn(state.me);
  return () => listeners.delete(fn);
}

export function watchMe(onDenied) {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.watchPosition(p => {
    state.me = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
    listeners.forEach(fn => fn(state.me));
  }, onDenied, { enableHighAccuracy: true, maximumAge: 2000 });
}
