// Start-up: wires the pieces together and opens the home page.
import { register, go } from "./components/router.js";
import { startMap, viewCenter } from "./components/mapView.js";
import { startBuildingLayer, loadBuildings, refreshStyles } from "./components/buildingLayer.js";
import { initSheet, showBuilding, openFromLink } from "./components/buildingSheet.js";
import { openStore } from "./data/store.js";
import { loadShared, loadContribs } from "./data/contributions.js";
import { home } from "./pages/home.js";
import { camera } from "./pages/camera.js";
import { saved } from "./pages/saved.js";
import { scan } from "./pages/scan.js";
import { review } from "./pages/review.js";
import { nearby } from "./pages/nearby.js";
import { library } from "./pages/library.js";
import { help } from "./pages/help.js";

register({ home, camera, saved, scan, review, nearby, library, help });
startMap();
startBuildingLayer(showBuilding);
initSheet();
go("home");

(async () => {
  try { await openStore(); } catch (e) { /* no phone storage */ }
  await loadContribs();
  loadBuildings();
  loadShared(viewCenter()).then(loadContribs).then(refreshStyles);
  openFromLink();
})();
