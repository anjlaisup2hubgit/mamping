// Gives every found building a tidy outline (in picture pixels): a rectangle, or a traced roof if the user chose the roof model.
import { getSettings } from "./settings.js";
import { rectOf } from "./geo.js";
import { samTrace } from "./sam.js";
import { checkCancelled } from "./tasks.js";

const centre = pts => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

export async function outlineAll(image, found, { signal, onStage } = {}) {
  const roof = getSettings().outline === "roof";
  const result = [];
  for (const b of found) { // one at a time: the model handles one request at once
    checkCancelled(signal);
    onStage?.(`Tracing roof ${result.length + 1}/${found.length}`);
    let points = null;
    if (roof) {
      try { points = await samTrace(image, centre(b.points), { signal }); }
      catch (e) { checkCancelled(signal); console.warn("[roof model] failed, using rectangle:", e); }
    }
    result.push({ ...b, points: points || rectOf(b.points) });
  }
  return result;
}
