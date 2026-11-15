// Remembers the edits you sent to OpenStreetMap on this phone, newest first.
// An entry is { at, kind: "tags", wayId, added, cs, version } or { at, kind: "create", ways, cs }, plus undone: true once undone.

import { storageScope, readStored, writeStored, migrateGuest } from "./accountStorage.js";
import { setSaveStatus } from "./saveStatus.js";

const KEY = "osm_history";

export const getHistory = () => { try { migrateGuest(KEY); return readStored(KEY, []); } catch (e) { setSaveStatus("failed", e.message); return []; } };
const save = (list, scope = storageScope()) => { try { writeStored(KEY, list.slice(0, 200), scope); } catch (e) { setSaveStatus("failed", "The map edit succeeded, but its history could not be saved on this device."); } };

export const addHistory = (entry, scope = storageScope()) => save([{ at: Date.now(), ...entry }, ...readStored(KEY, [], scope)], scope);
export const markUndone = at => save(getHistory().map(e => (e.at === at ? { ...e, undone: true } : e)));

// Counts what you added in the last 7 days, for the "this week" message.
export function weekCounts() {
  const since = Date.now() - 7 * 864e5, recent = getHistory().filter(e => e.at > since && !e.undone);
  return {
    heights: recent.filter(e => e.kind === "tags" && (e.added.height || e.added["building:levels"])).length,
    buildings: recent.filter(e => e.kind === "create").reduce((n, e) => n + e.ways.length, 0)
  };
}
