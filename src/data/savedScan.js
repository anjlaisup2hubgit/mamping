// Remembers the orange "missing building" boxes. Always kept on this phone first. Logged in: also sent to the server
// under your OpenStreetMap account. If sending fails, the phone copy is marked "unsent" and sent again later, so nothing is lost.
import { isLoggedIn } from "./osmAuth.js";
import { getScan, putScan } from "./api.js";

const KEY = "missing_scan", UNSENT = "missing_scan_unsent";
const plain = list => list.map(({ coords, center, confidence, from, keep }) => ({ coords, center, confidence, from, keep: !!keep }));
const wait = ms => new Promise(ok => setTimeout(ok, ms));

const loadLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
};
const markUnsent = on => {
  try { if (on) localStorage.setItem(UNSENT, "1"); else localStorage.removeItem(UNSENT); } catch (e) { /* cannot save */ }
};
const isUnsent = () => { try { return !!localStorage.getItem(UNSENT); } catch (e) { return false; } };

// Sends the phone copy to your account, trying 3 times. Only one send at a time, so two saves never clash;
// a change made during a send goes right after it. Fails with "401" if the login has run out.
let sending = null, again = false;
function send() {
  if (sending) { again = true; return sending; }
  sending = (async () => {
    do {
      again = false;
      for (let i = 0; ; i++) {
        try { await putScan(loadLocal()); break; }
        catch (e) { if (e.message === "401" || i === 2) throw e; await wait(1000 * 3 ** i); } // wait 1 s, then 3 s
      }
    } while (again);
    markUnsent(false);
  })().finally(() => { sending = null; });
  return sending;
}

export async function loadScan() {
  if (isLoggedIn() && isUnsent()) { send().catch(() => {}); return loadLocal(); } // the phone has newer boxes than the server
  if (isLoggedIn()) {
    try {
      const saved = await getScan(), local = loadLocal();
      if (!saved.length && local.length) { markUnsent(true); send().catch(() => {}); return local; } // made before logging in: keep them and send them up
      return saved;
    } catch (e) { console.error("[scan] could not load from server:", e); }
  }
  return loadLocal();
}

// Returns a promise that fails if the server could not save (the boxes are still on this phone).
export function saveScan(list) {
  try { localStorage.setItem(KEY, JSON.stringify(plain(list))); } catch (e) { /* cannot save */ }
  if (!isLoggedIn()) return Promise.resolve();
  markUnsent(true);
  return send();
}

// Back online: send anything that did not get through.
addEventListener("online", () => { if (isLoggedIn() && isUnsent()) send().catch(() => {}); });

// Called on log out so the next person on this phone does not see these boxes.
export const clearLocalScan = () => {
  try { localStorage.removeItem(KEY); localStorage.removeItem(UNSENT); } catch (e) { /* nothing to clear */ }
};
