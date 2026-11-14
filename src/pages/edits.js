// My edits: what you added this week and your OpenStreetMap edits, with Undo for the newest one.
import { header, bindBack } from "../components/header.js";
import { editHistory, bindEditHistory } from "../components/editHistory.js";

export const edits = {
  open(el) {
    el.innerHTML = header("My edits") + `<div class="pad scroll" id="edits"></div>`;
    bindBack(el, "settings");
    const draw = () => { const e = el.querySelector("#edits"); e.innerHTML = editHistory(); bindEditHistory(e, draw); };
    draw();
  }
};
