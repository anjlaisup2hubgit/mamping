// Builds the training set for a detector: each satellite picture saved with a label file listing the ticked buildings in it.
import { getSatelliteView } from "./satellite.js";
import { writeTraining } from "./trainingApi.js";
import { inSquare } from "./geo.js";

const SIZE = 768; // a picture is 3x3 tiles of 256 pixels
const clamp = v => Math.min(1, Math.max(0, v));

// One label line per building, in the standard YOLO format: class x-middle y-middle width height (all 0 to 1).
function labelLine(coords, toPixel) {
  const xs = [], ys = [];
  coords.forEach(([lat, lng]) => { const [x, y] = toPixel(lat, lng); xs.push(clamp(x / SIZE)); ys.push(clamp(y / SIZE)); });
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return `0 ${((x0 + x1) / 2).toFixed(6)} ${((y0 + y1) / 2).toFixed(6)} ${(x1 - x0).toFixed(6)} ${(y1 - y0).toFixed(6)}`;
}

// Save whole scenes, including empty scenes; every picture still needs complete-scene review.
export async function saveTrainingSet(squares, boxes) {
  let saved = 0;
  for (const p of squares) {
    const mine = boxes.filter(b => inSquare(b.center, p));
    const view = await getSatelliteView(...p.centre);
    const labels = [...new Set(mine.map(b => labelLine(b.coords, view.toPixel)))].join("\n");
    await writeTraining({ name: `${p.centre[0].toFixed(6)}_${p.centre[1].toFixed(6)}`, image: view.image, labels,
      centre: p.centre, bounds: [p.nw, p.se] });
    saved++;
  }
  return saved;
}
