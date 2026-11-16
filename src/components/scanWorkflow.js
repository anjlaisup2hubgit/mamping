// Owns the selected area and running scan; editing stays available as each picture finishes.
import { state } from "../data/state.js";
import { runScanJob } from "../data/scanJob.js";
import { bounded } from "../data/tasks.js";
import { inSquare, dist } from "../data/geo.js";
import { readScanSession, saveScanSession } from "../data/scanSession.js";
import { getSettings } from "../data/settings.js";
import { readyIn } from "../data/readyBuildings.js";
import { saveTrainingSet } from "../data/trainingSet.js";
import { map, currentBase, setBaseLayer } from "./mapView.js";
import { loadBuildings } from "./buildingLayer.js";
import { pickArea } from "./areaPicker.js";
import { showReview, showNoneFound } from "./reviewBar.js";
import { addBoxes, currentBoxes, focusedBox, nearBox } from "./missingLayer.js";
import { autoFix } from "./autoFix.js";
import { showScanProgress } from "./scanProgress.js";
import { toast } from "./toast.js";

let running = null, retry = [];
const copy = pictures => pictures.map(p => ({ centre: [...p.centre], nw: [...p.nw], se: [...p.se] }));
const message = e => e.detail || e.message || "Could not scan this picture. Check the connection and try again.";
export const cancelScan = () => running?.abort(new DOMException("Scan cancelled; finished results are saved.", "AbortError"));

function remember(pictures) {
  try { saveScanSession(pictures); }
  catch (e) { toast("The scan area could not be saved on this device: " + e.message); }
}

export function findMissing() {
  if (running) return toast("A scan is running. Use Cancel before choosing another area.");
  if (map.getZoom() < 17) return toast("Zoom in closer to scan.");
  if (currentBase() !== "satellite") setBaseLayer("satellite");
  pickArea((_, chosen) => {
    if (running || !chosen.length) return;
    const pictures = copy(chosen); remember(pictures); start(pictures, true);
  }, 6);
}

export function scanWithAi() {
  if (running) return toast("A scan is already running.");
  const pictures = readScanSession().slice(0, 6);
  if (!pictures.length) { toast("Choose the pictures to scan again."); return findMissing(); }
  return start(pictures);
}

export function retryFailedScan() {
  if (running || !retry.length) return;
  return start(copy(retry));
}

function showResults() {
  // New results must not close an inspector or erase the user's current editing gesture.
  if (focusedBox()) return;
  if (currentBoxes().length) showReview(); else showNoneFound();
}

async function ready(pictures, signal) {
  const bounds = L.latLngBounds(pictures.flatMap(p => [p.nw, p.se])), c = bounds.getCenter();
  showScanProgress("Checking ready-made outlines", { cancel: cancelScan });
  await bounded(loadBuildings(), { signal, timeout: 5000, label: "Existing buildings" }).catch(() => {});
  let list;
  try { list = await readyIn(bounds, { signal }); }
  catch (e) { if (signal.aborted) throw e; return false; }
  list = list.filter(b => pictures.some(p => inSquare(b.center, p)) && ![...state.buildings.values()].some(o => nearBox(b.center, o)))
    .sort((a, b) => dist(c.lat, c.lng, ...a.center) - dist(c.lat, c.lng, ...b.center));
  if (!list.length) return false;
  const fresh = addBoxes(list.slice(0, 500));
  autoFix(fresh).catch(() => {});
  showResults();
  showScanProgress(`${fresh.length} ready-made outlines · review before adding`, { done: true });
  return true;
}

async function start(pictures, tryReady = false) {
  if (running || !pictures.length) return;
  const controller = new AbortController(), chosen = copy(pictures);
  running = controller; retry = [];
  const btn = document.querySelector("#findMiss");
  if (btn) { btn.classList.add("busy"); btn.disabled = true; }
  let found = 0;
  try {
    if (tryReady && await ready(chosen, controller.signal)) return;
    const result = await runScanJob(chosen, {
      signal: controller.signal, clarify: getSettings().enhancement === "on",
      onProgress: p => showScanProgress(`Picture ${p.index}/${p.total} · ${p.stage} · ${p.completed} finished`, { cancel: cancelScan }),
      onResult: (buildings, picture) => {
        const missing = buildings.filter(b => inSquare(b.center, picture) && ![...state.buildings.values()].some(o => nearBox(b.center, o)));
        const fresh = addBoxes(missing);
        found += fresh.length;
        autoFix(fresh).catch(() => {});
        showResults();
      }
    });
    retry = [...result.failed, ...result.unfinished];
    const summary = `${result.cancelled ? "Cancelled" : "Scan finished"} · ${found} new outlines · ${result.completed}/${result.total} pictures`;
    const explanation = result.errors.length ? ` · ${message(result.errors[0])}` : "";
    const fallback = result.fallback ? ` · ${result.fallback} used original pictures` : "";
    showScanProgress(summary + explanation + fallback, { done: true, retry: retry.length ? retryFailedScan : null });
    if (!result.cancelled || currentBoxes().length) showResults();
  } catch (e) {
    retry = chosen;
    showScanProgress(controller.signal.aborted ? "Scan cancelled; finished results are saved." : message(e), { done: true, retry: retryFailedScan });
  } finally {
    running = null;
    if (btn) { btn.classList.remove("busy"); btn.disabled = false; }
  }
}

function labelsForTraining(ticked = currentBoxes().filter(b => b.keep && b.reviewed)) {
  const all = [...ticked, ...state.buildings.values()];
  return all.filter((b, i) => !all.slice(0, i).some(o => (b.id && b.id === o.id) || dist(...b.center, ...o.center) < 0.5));
}

// Sends the scanned pictures with their checked roofs as finished training pictures (no second review needed).
export async function saveForTraining(ticked) {
  const pictures = readScanSession();
  if (!pictures.length) return toast("Choose an area first so the original pictures can be saved.");
  if (!confirm("Is EVERY roof in these pictures marked and checked, including ones the AI missed? Send them for training?")) return;
  toast("Sending pictures and roofs for training…");
  try { const n = await saveTrainingSet(pictures, labelsForTraining(ticked), "kept"); toast(`Sent ${n} picture(s) for training.`); }
  catch (e) { toast(e.detail || "Could not save training pictures. Check the training service."); }
}
