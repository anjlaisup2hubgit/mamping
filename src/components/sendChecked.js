// Sends every checked building to OpenStreetMap together. Used by the bottom bar and by the inspector's Send button.
import { toast } from "./toast.js";
import { isLoggedIn } from "../data/osmAuth.js";
import { sendOrQueue } from "../data/osmSend.js";
import { overlapsExisting } from "../data/buildings.js";
import { showSentBuildings } from "./buildingLayer.js";
import { validatePolygon } from "../data/geometry.js";
import { validateBuildingTags } from "../data/buildingTags.js";
import { removeBoxes, currentBoxes, saveForTraining } from "./missingLayer.js";

const short = from => from.split(" ")[0]; // "Microsoft ML Buildings" -> "Microsoft"
const sourceOf = list => [...new Set(list.map(b => b.from).filter(Boolean)), "Esri World Imagery"].join("; ");
let warned = false; // the overlap warning shows once; tapping again adds anyway

// button = the Send button (disabled while sending). Returns true once sent.
export async function sendChecked(kept, button) {
  if (!kept.length) { toast("Check a building first, then send."); return false; }
  if (!isLoggedIn()) { toast("Connect OpenStreetMap in Settings first."); return false; }
  const problem = kept.map(b => validatePolygon(b.coords) || validateBuildingTags(b.tags || {})).find(Boolean);
  if (problem) { toast(problem); return false; }
  const clash = kept.filter(b => overlapsExisting(b.coords)).length;
  if (clash && !warned) { warned = true; toast(`${clash} kept building${clash > 1 ? "s overlap ones" : " overlaps one"} already on the map. Tap Send again to add anyway.`); return false; }
  const n = `${kept.length} building${kept.length > 1 ? "s" : ""}`;
  if (!confirm(`Send ${n} to OpenStreetMap? Only send outlines you checked against the picture.`)) return false;
  button.disabled = true; // no double send
  try {
    const items = kept.map(b => ({ corners: b.coords, tags: { ...b.tags } }));
    const r = await sendOrQueue({ kind: "create", items, source: sourceOf(kept),
      comment: kept.some(b => b.from) ? `Add missing buildings from ${[...new Set(kept.map(b => b.from).filter(Boolean).map(short))].join("/")} outlines, checked against satellite imagery` : "Add missing buildings traced from satellite imagery" });
    showSentBuildings(items, r.result);
    toast(r.queued ? "Edit saved on this device; check Pending edits for sending status." : `${n} added to OpenStreetMap`);
    warned = false;
    removeBoxes(kept); // the rest stay, so you can keep checking
    if (!currentBoxes().length && !r.queued) saveForTraining(kept, true); // every outline here is checked, so the pictures can teach the AI
    return true;
  } catch (e) {
    if (button.isConnected) button.disabled = false;
    toast("Could not reach OpenStreetMap: " + e.message);
    return false;
  }
}
