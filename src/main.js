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
import { applySettings } from "./data/settings.js";
import { startTooltips } from "./components/tooltip.js";

applySettings();
startTooltips();
const later = (file, name) => () => import(`./pages/${file}.js`).then(m => m[name]); // load only when opened
register({
  map: mapPage, home: later("home", "home"), camera: later("camera", "camera"), saved: later("saved", "saved"),
  scan: later("scan", "scan"), review: later("review", "review"), nearby: later("nearby", "nearby"),
  help: later("help", "help"), settings: later("settings", "settings")
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); // works offline next time
startMap();
startBuildingLayer(showBuilding);
initSheet();
go("map");

(async () => {
  try { if (await finishLogin()) toast("OpenStreetMap connected"); } catch (e) { toast("OpenStreetMap login failed"); }
  try { await openStore(); } catch (e) { /* no phone storage */ }
  await loadContribs();
  loadBuildings();
  loadShared(viewCenter()).then(loadContribs).then(refreshStyles);
  openFromLink();
})();
