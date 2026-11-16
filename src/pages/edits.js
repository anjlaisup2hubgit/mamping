// My edits: what you added this week and your OpenStreetMap edits, with Undo for the newest one.
import { header, bindBack } from "../components/header.js";
import { editHistory, bindEditHistory } from "../components/editHistory.js";
import { weekCounts } from "../data/history.js";
import { getQueue } from "../data/osmSend.js";

export const edits = {
  open(el) {
    el.innerHTML = header("My contributions") + `<div class="pad scroll" id="edits"></div>`;
    bindBack(el, "settings");
    const draw = () => {
      const e = el.querySelector("#edits"), { heights, buildings } = weekCounts();
      e.innerHTML = `<span class="eyebrow">Your work this week</span><div class="contributionSummary"><div><strong>${buildings}</strong><span>Buildings added</span></div><div><strong>${heights}</strong><span>Height / floor edits</span></div><div><strong>${getQueue().length}</strong><span>Pending edits</span></div></div>` + editHistory();
      bindEditHistory(e, draw);
    };
    draw();
  }
};
