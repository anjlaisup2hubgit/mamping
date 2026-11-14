// "Remove several": tap the boxes on the map that are not buildings, then remove them all with one button.
import { $ } from "./dom.js";
import { openSheet } from "./sheet.js";
import { removeBoxes, restyle, unfocus, currentBoxes } from "./missingLayer.js";
import { showBatch } from "./batchSheet.js";

let on = false;
const marked = () => currentBoxes().filter(b => b.marked);

// Called when a box on the map is tapped. Returns false when not choosing, so the tap works as usual.
export function markBox(b) {
  if (on && !document.querySelector("#bsheet.on #rmGo")) clear(); // the bar was closed another way (Esc)
  if (!on) return false;
  b.marked = !b.marked;
  restyle();
  update();
  return true;
}

function update() {
  const n = marked().length;
  $("#rmGo").disabled = !n;
  $("#rmGo").textContent = n ? `Remove ${n}` : "Remove";
}

function clear() {
  on = false;
  currentBoxes().forEach(b => { b.marked = false; });
  restyle();
}

// Back to the list, with nothing chosen.
function stop() {
  clear();
  if (currentBoxes().length) showBatch(currentBoxes());
}

export function startRemoving() {
  on = true;
  unfocus();
  openSheet(`<span style="flex:1;font-size:14px">Tap boxes that are not buildings</span>
    <button class="primary pill" id="rmGo"></button>`, true);
  update();
  $("#rmGo").onclick = () => {
    removeBoxes(marked());
    stop();
  };
  $("#bsheet .x").onclick = stop; // ✕ cancels: nothing is removed
}
