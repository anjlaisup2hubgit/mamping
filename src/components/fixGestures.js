// Quick gestures for the outline being fixed. On the roof: double-click / double-tap = Square, mouse wheel = turn.
// Anywhere on the map: a quick 2-finger tap = Undo, a quick 3-finger tap = Redo (2-finger drags still tilt the map).
import { map } from "./mapView.js";
import { doFix } from "./fixActions.js";
import { focusedBox } from "./missingLayer.js";

let roof = null, onDouble = null, onWheel = null;

export function stopGestures() {
  if (roof) { roof.off("dblclick", onDouble); roof.getElement()?.removeEventListener("wheel", onWheel); }
  roof = null; onDouble = onWheel = null;
}

// shape = the roof polygon being fixed; act.square() and act.turn(deg, again) are the editor's own moves.
export function watchGestures(shape, act) {
  stopGestures();
  roof = shape;
  listenForTaps();
  onDouble = e => { L.DomEvent.stop(e); act.square(); };
  onWheel = e => { e.preventDefault(); e.stopPropagation(); act.turn(e.deltaY < 0 ? 1 : -1, false); }; // 1° per notch
  roof.on("dblclick", onDouble);
  roof.getElement()?.addEventListener("wheel", onWheel, { passive: false });
}

let start = null, listening = false;
function listenForTaps() { // the map does not exist yet when this file loads, so hook it up the first time
  if (listening) return;
  listening = true;
  const el = map.getContainer();
  el.addEventListener("touchstart", e => {
    if (!focusedBox()) return;
    start = { fingers: Math.max(e.touches.length, start?.fingers || 0), at: Date.now(), x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  el.addEventListener("touchend", e => {
    if (!start || e.touches.length) return; // wait until every finger is up
    const s = start, t = e.changedTouches[0];
    start = null;
    const still = Math.hypot(t.clientX - s.x, t.clientY - s.y) < 12;
    if (focusedBox() && still && Date.now() - s.at < 250 && s.fingers >= 2) doFix(s.fingers === 2 ? "undo" : "redo");
  }, { passive: true });
}
