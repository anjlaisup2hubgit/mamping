// Gives every found building a tidy outline (in picture pixels): a rectangle, or a traced roof if the user chose the roof model.
import { getSettings } from "./settings.js";
import { rectOf } from "./geo.js";
import { samTrace } from "./sam.js";

const centre = pts => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

export async function outlineAll(image, found) {
  const roof = getSettings().outline === "roof";
  const result = [];
  for (const b of found) { // one at a time: the model handles one request at once
    let points = null;
    if (roof) {
      try { points = await samTrace(image, centre(b.points)); } catch (e) { console.warn("[roof model] failed, using rectangle:", e); }
    }
    result.push({ ...b, points: points || rectOf(b.points) });
  }
  return result;
}
