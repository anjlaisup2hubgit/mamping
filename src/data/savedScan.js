// Remembers the orange "missing building" boxes. Logged in: kept on the server under your OpenStreetMap account. Not logged in: kept on this phone only.
import { isLoggedIn } from "./osmAuth.js";
import { getScan, putScan } from "./api.js";

const KEY = "missing_scan";
const plain = list => list.map(({ coords, center, confidence }) => ({ coords, center, confidence }));

const loadLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
};

export async function loadScan() {
  if (isLoggedIn()) {
    try { return await getScan(); } catch (e) { console.error("[scan] could not load from server:", e); }
  }
  return loadLocal();
}

// Returns a promise that fails if the server could not save.
export function saveScan(list) {
  try { localStorage.setItem(KEY, JSON.stringify(plain(list))); } catch (e) { /* cannot save */ }
  return isLoggedIn() ? putScan(plain(list)) : Promise.resolve();
}

// Called on log out so the next person on this phone does not see these boxes.
export const clearLocalScan = () => {
  try { localStorage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
};
