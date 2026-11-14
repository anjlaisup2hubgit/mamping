// Start-up: wires the pieces together and opens the home page.
import { register, go } from "./components/router.js";
import { startMap, viewCenter } from "./components/mapView.js";
import { startBuildingLayer, loadBuildings, refreshStyles } from "./components/buildingLayer.js";
import { initSheet, showBuilding, openFromLink } from "./components/buildingSheet.js";
import { openStore } from "./data/store.js";
import { finishLogin } from "./data/osmAuth.js";
import { toast } from "./components/toast.js";
import { loadShared, loadContribs } from "./data/contributions.js";
import { map as mapPage } from "./pages/map.js";
import { startTooltips } from "./components/tooltip.js";
import { restoreMissing } from "./components/missingLayer.js";
import { flushQueue } from "./data/osmSend.js";

// Sends edits that were saved while offline.
async function sendWaiting() {
  const { sent, failed } = await flushQueue();
  if (sent) toast(`${sent} saved edit${sent > 1 ? "s" : ""} sent to OpenStreetMap`);
  if (failed) toast(`${failed} saved edit${failed > 1 ? "s were" : " was"} refused by OpenStreetMap`);
}
window.addEventListener("online", sendWaiting);

startTooltips();
const later = (file, name) => () => import(`./pages/${file}.js`).then(m => m[name]); // load only when opened
register({
  map: mapPage, camera: later("camera", "camera"), saved: later("saved", "saved"),
  scan: later("scan", "scan"), review: later("review", "review"), drive: later("drive", "drive"),
  help: later("help", "help"), settings: later("settings", "settings"),
  videos: later("videos", "videos"), outlines: later("outlines", "outlines"),
  edits: later("edits", "edits"), scanSettings: later("scanSettings", "scanSettings")
});
// Remove the old saved copies so nothing is cached anymore.
if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
startMap();
startBuildingLayer(showBuilding);
initSheet();
go("map");

(async () => {
  try { if (await finishLogin()) toast("OpenStreetMap connected"); } catch (e) { toast("OpenStreetMap login failed"); }
  restoreMissing(); // after the login finishes, so we know whose boxes to load
  sendWaiting();
  try { await openStore(); } catch (e) { /* no phone storage */ }
  await loadContribs();
  loadBuildings();
  loadShared(viewCenter()).then(loadContribs).then(refreshStyles);
  openFromLink();
})();
