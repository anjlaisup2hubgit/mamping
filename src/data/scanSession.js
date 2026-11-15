// Remember the original selected pictures so a restored scan can be retried or saved for training.
import { readStored, writeStored } from "./accountStorage.js";

const validPoint = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
export function readScanSession() {
  try {
    const saved = readStored("scan_session", []);
    return Array.isArray(saved) ? saved.filter(p => validPoint(p.centre) && validPoint(p.nw) && validPoint(p.se)).slice(0, 30) : [];
  } catch { return []; }
}
export function saveScanSession(squares) {
  writeStored("scan_session", squares.map(({ centre, nw, se }) => ({ centre, nw, se })));
}
