// Train button for the Training page: starts teaching the roof detector on this computer and shows how far it is.
import { getTrain, startTrain } from "../data/api.js";
import { toast } from "./toast.js";

let timer = null;

const note = s =>
  s.state === "running" ? (s.epochs ? `Training: round ${s.epoch} of ${s.epochs}` : "Starting…")
  : s.state === "done" ? `Trained on ${s.pictures} picture${s.pictures === 1 ? "" : "s"}. Score: ${Math.round(s.score * 100)} out of 100.`
  : s.state === "failed" ? s.error : "";

function show(box, s) {
  const busy = s.state === "running";
  box.innerHTML = `<p class="mid" style="margin:0 0 8px;text-align:center"></p>` +
    (busy ? `<div class="bar"><i style="width:${s.epochs ? s.epoch / s.epochs * 100 : 0}%"></i></div>` : `<button class="big ghost" id="trainGo">Train AI</button>`);
  box.querySelector("p").textContent = note(s);
  if (!busy) box.querySelector("#trainGo").onclick = () => startTrain().then(() => watch(box), () => toast("Could not start training."));
}

// Shows the newest progress, and keeps checking every 2 seconds while training runs.
async function watch(box) {
  clearTimeout(timer);
  const s = await getTrain();
  show(box, s);
  if (s.state === "running") timer = setTimeout(() => watch(box), 2000);
}

export const bindTrain = watch;
export const stopTrain = () => clearTimeout(timer);
