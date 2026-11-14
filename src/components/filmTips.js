// Filming tips shown over the camera before the first video, so the AI gets clear pictures.
import { getSettings, saveSetting } from "../data/settings.js";

export const FILM_TIPS = [
  "Hold the phone sideways.",
  "Walk slowly and keep the phone steady.",
  "Keep the whole building in view, from the ground to the roof.",
  "Film in daylight.",
  "Wait until GPS shows a small number (under 30 m).",
  "Driving? Switch to Driving, mount the phone sideways facing the buildings, and never touch it while driving."
];

export const tipsSeen = () => !!getSettings().filmTipsSeen;

// Shows the tips; calls onDone when the user taps "Got it".
export function showFilmTips(parent, onDone) {
  const box = document.createElement("div");
  box.className = "tips";
  box.innerHTML = `<div class="tipsCard"><h2 style="margin:0">How to film a building</h2>
    <ol>${FILM_TIPS.map(t => `<li>${t}</li>`).join("")}</ol>
    <label class="row" style="gap:10px;display:flex;align-items:center"><input type="checkbox" id="tipsHide" checked> Don't show again</label>
    <button class="big primary" id="tipsOk">Got it</button></div>`;
  parent.appendChild(box);
  box.querySelector("#tipsOk").onclick = () => {
    if (box.querySelector("#tipsHide").checked) saveSetting("filmTipsSeen", true);
    box.remove();
    onDone();
  };
}
