// Prepares one satellite picture, finds roofs, and turns their pixel corners into map points.
import { getSatelliteView } from "./satellite.js";
import { enhanceImage } from "./enhanceImage.js";
import { findBuildings } from "./finder.js";
import { outlineAll } from "./tracer.js";
import { mid } from "./geo.js";
import { validatePolygon } from "./geometry.js";
import { releaseSamImage } from "./sam.js";
import { checkCancelled } from "./tasks.js";

const valid = b => Array.isArray(b?.points) && b.points.length >= 3 && b.points.length <= 100
  && b.points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 768))
  && !validatePolygon(b.points, { pixels: true }) && Number.isFinite(b.confidence) && b.confidence >= 0 && b.confidence <= 1;

export async function scanImage(lat, lng, clarify = false, { signal, onStage } = {}) {
  checkCancelled(signal);
  onStage?.("Loading satellite picture");
  const view = await getSatelliteView(lat, lng, { signal });
  let image = view.image, fallback = false;
  if (clarify) {
    onStage?.("Clarifying picture");
    try { image = await enhanceImage(image, { signal }); }
    catch (e) { checkCancelled(signal); fallback = true; console.warn("[enhance] using original satellite picture:", e); }
  }
  try {
    onStage?.("Finding roofs");
    const candidates = (await findBuildings(image, { signal })).filter(valid);
    checkCancelled(signal);
    onStage?.("Tracing roofs");
    const found = await outlineAll(image, candidates, { signal, onStage });
    const buildings = found.filter(valid).map(b => {
      const coords = b.points.map(([x, y]) => view.toLatLng(x, y));
      return { coords, center: mid(coords), confidence: b.confidence };
    });
    checkCancelled(signal);
    return { buildings, fallback };
  } finally { releaseSamImage(image); }
}
