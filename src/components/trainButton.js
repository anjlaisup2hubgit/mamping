// Training failures and missing prerequisites stay visible; polling never replaces a POST failure with idle.
import { readTrain, beginTrain } from "../data/trainingApi.js";
import { trainingModels } from "./trainingModels.js";

let timer = null, generation = 0;
const note = s => s.state === "running" ? `${s.stage || "Training"}${s.epochs ? ` · round ${s.epoch} of ${s.epochs}` : "…"}`
  : s.state === "done" ? `Trained on ${s.pictures || 0} pictures. Held-out score: ${Math.round((s.score || 0) * 100)}%.`
  : s.state === "failed" ? s.error || "Training failed. See the worker log." : "Train a candidate, evaluate it, then activate it explicitly.";

async function show(box, s, token) {
  if (token !== generation || !box.isConnected) return;
  const busy = s.state === "running", capability = s.capabilities || {};
  box.innerHTML = `<p id="trainMessage" class="mid" role="status" style="margin:0 0 8px"></p>
    <p id="trainCapability" class="mid" style="font-size:12px;margin:4px 0"></p>
    ${busy ? '<div class="bar"><i></i></div>' : '<button class="big ghost" id="trainGo">Train AI</button>'}
    <div id="trainingModels"></div>`;
  box.querySelector("#trainMessage").textContent = note(s);
  const missing = capability.missing || [];
  box.querySelector("#trainCapability").textContent = capability.available === false
    ? `Training unavailable: ${missing.join(", ") || "local worker required"}. Install the local training tools; see docs/training.md.`
    : capability.workerConnected ? "Connected to your persistent training worker."
    : capability.localOnly ? "Training runs on this workstation. Hosted training needs a separate worker and persistent storage." : "";
  if (busy) box.querySelector(".bar i").style.width = `${s.epochs ? s.epoch / s.epochs * 100 : 0}%`;
  else {
    const button = box.querySelector("#trainGo");
    button.disabled = capability.available === false;
    button.onclick = async () => {
      button.disabled = true;
      try {
        const started = await beginTrain();
        await show(box, started, token);
        if (started.state === "running" && token === generation) timer = setTimeout(() => watch(box, token), 2000);
      } catch (e) { box.querySelector("#trainMessage").textContent = e.message; button.disabled = false; }
    };
  }
  await trainingModels(box.querySelector("#trainingModels"));
}

async function watch(box, token) {
  clearTimeout(timer);
  try {
    const state = await readTrain();
    await show(box, state, token);
    if (state.state === "running" && token === generation) timer = setTimeout(() => watch(box, token), 2000);
  } catch (e) { if (token === generation && box.isConnected) box.textContent = e.message; }
}

export const bindTrain = box => { clearTimeout(timer); return watch(box, ++generation); };
export const stopTrain = () => { generation++; clearTimeout(timer); };
