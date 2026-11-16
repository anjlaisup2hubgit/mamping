// Every action for the box being fixed, in one place. The buttons (shapeTools.js) and the keys (fixKeys.js) both call doFix(name).
import { squareShape, lineUpShape, snapShape, undoShape, redoShape, turnBy } from "./cornerEditor.js";
import { focusedBox, boxPosition, fixAt, addBox, unfocus, restyle, saveBoxes } from "./missingLayer.js";
import { dropOne } from "./reviewBar.js";
import { startCopying } from "./copyShape.js";
import { pickStreet } from "./streetPicker.js";
import { toast } from "./toast.js";
import { validatePolygon } from "../data/geometry.js";
import { validateBuildingTags } from "../data/buildingTags.js";

// again = true for the repeats while a turn button is held down.
export function doFix(name, again = false) {
  const b = focusedBox();
  if (!b) return;
  const { i } = boxPosition();
  if (name === "rect") squareShape();
  else if (name === "line") lineUpShape();
  else if (name === "snap") snapShape();
  else if (name === "street") pickStreet(lineUpShape);
  else if (name === "turnL") turnBy(1, again);
  else if (name === "turnR") turnBy(-1, again);
  else if (name === "undo") { if (!undoShape()) toast("Nothing to undo."); }
  else if (name === "redo") { if (!redoShape()) toast("Nothing to redo."); }
  else if (name === "copy") { const coords = b.coords; unfocus(); startCopying(coords, addBox); }
  else if (name === "next") fixAt(i + 1);
  else if (name === "prev") fixAt(i - 1);
  else if (name === "keep") {
    const invalid = document.querySelector("#bsheet input:invalid");
    if (invalid) return invalid.reportValidity();
    const problem = validatePolygon(b.coords) || validateBuildingTags(b.tags || {});
    if (problem) return toast(problem);
    b.keep = true; b.reviewed = true; restyle(); saveBoxes(); fixAt(i + 1);
  }
  else if (name === "remove") { dropOne(b); fixAt(i); } // the next box slides into this spot
}
