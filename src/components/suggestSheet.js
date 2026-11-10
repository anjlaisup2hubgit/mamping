// The panel for an AI-drawn missing building: name it and submit it.
import { sendContribution } from "../data/api.js";
import { $ } from "./dom.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";

export function showSuggestion(polygon, center, confidence) {
  openSheet(`<div><h2>Missing building</h2><p class="mid" style="margin:4px 0 0">AI outline · ${Math.round((confidence || 0) * 100)}% sure</p></div>
    <div><label for="sn">Name</label><input type="text" id="sn" placeholder="What is it?"></div>
    <div class="row"><button class="big primary" id="subO" style="min-height:48px">Submit outline</button><button class="big ghost" id="clsO" style="min-height:48px">Close</button></div>`);
  $("#clsO").onclick = closeSheet;
  $("#subO").onclick = async () => {
    try {
      await sendContribution({ kind: "outline", lat: center[0], lng: center[1], name: $("#sn").value, polygon });
      toast("Outline submitted");
      closeSheet();
    } catch (e) { toast("Could not submit"); }
  };
}
