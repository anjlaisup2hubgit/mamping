// Show which trained detector is actually used, and require an explicit activation or rollback.
import { readModels, changeModel } from "../data/trainingApi.js";
import { saveSetting } from "../data/settings.js";

const escape = text => String(text ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const percent = value => Number.isFinite(value) ? `${Math.round(value * 100)}%` : "not evaluated";

export async function trainingModels(el) {
  let registry;
  try { registry = await readModels(); }
  catch (e) { el.textContent = e.message; return; }
  const { active, candidate, previous } = registry;
  el.innerHTML = `<details class="modelSummary"><summary>Trained detector · ${escape(active?.version || "none active")}</summary>
    <p>Active: ${escape(active?.version || "none")}</p>
    ${candidate ? `<p>Candidate: ${escape(candidate.version)} · ${candidate.validationPictures || 0} held-out pictures</p>
      <p>Same held-out pictures: candidate ${percent(candidate.score)} · baseline ${percent(candidate.baselineScore)}</p>` : "<p>No trained candidate yet. Train and evaluate a detector first.</p>"}
    <p>Activation changes future scans only. A previous detector can be restored.</p>
    <div class="trainingModelActions">
      <button class="ghost pill" id="activateModel"${candidate ? "" : " disabled"}>Activate candidate</button>
      <button class="ghost pill" id="rollbackModel"${previous ? "" : " disabled"}>Restore previous</button>
      <button class="ghost pill" id="useModel"${active ? "" : " disabled"}>Use active detector for scans</button></div>
    <p id="modelMessage" role="status"></p></details>`;
  const run = async body => {
    el.querySelectorAll("button").forEach(b => { b.disabled = true; });
    try { await changeModel(body); await trainingModels(el); }
    catch (e) { el.querySelector("#modelMessage").textContent = e.message; el.querySelectorAll("button").forEach(b => { b.disabled = false; }); }
  };
  el.querySelector("#activateModel").onclick = () => run({ action: "activate", version: candidate?.version });
  el.querySelector("#rollbackModel").onclick = () => run({ action: "rollback" });
  el.querySelector("#useModel").onclick = () => { saveSetting("finder", "trained"); el.querySelector("#modelMessage").textContent = `Future scans will use ${active.version}.`; };
}
