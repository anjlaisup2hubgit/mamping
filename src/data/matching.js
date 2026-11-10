// Finds which building a video shows: by GPS first, then by AI.
import { state } from "./state.js";
import { nearestBuilding, candidatesNear } from "./buildings.js";
import { grabFrames } from "./frames.js";
import { analyzeVideo } from "./api.js";

export async function matchClip(clip, point, onStep) {
  const near = nearestBuilding(point.lat, point.lng);
  let match = near && near.d < 60 ? near.b : null;
  let ai = null, aiFailed = false;
  try {
    onStep("AI is reading the video");
    const frames = await grabFrames(clip.blob, clip.secs);
    ai = await analyzeVideo({ frames, candidates: candidatesNear(point.lat, point.lng), lat: point.lat, lng: point.lng });
    if (ai.buildingId && state.buildings.has(ai.buildingId) && ai.confidence >= 0.4) match = state.buildings.get(ai.buildingId);
  } catch (e) { aiFailed = true; }
  return { match, ai, aiFailed };
}
