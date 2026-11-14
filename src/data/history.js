// Remembers the edits you sent to OpenStreetMap on this phone, newest first.
// An entry is { at, kind: "tags", wayId, added, cs, version } or { at, kind: "create", ways, cs }, plus undone: true once undone.
import { OSM_PRACTICE } from "./config.js";

const KEY = OSM_PRACTICE ? "osm_history_practice" : "osm_history"; // practice edits stay apart from real ones

export const getHistory = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
const save = list => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200))); } catch (e) { /* cannot save */ } };

export const addHistory = entry => save([{ at: Date.now(), ...entry }, ...getHistory()]);
export const markUndone = at => save(getHistory().map(e => (e.at === at ? { ...e, undone: true } : e)));

// Counts what you added in the last 7 days, for the "this week" message.
export function weekCounts() {
  const since = Date.now() - 7 * 864e5, recent = getHistory().filter(e => e.at > since && !e.undone);
  return {
    heights: recent.filter(e => e.kind === "tags" && (e.added.height || e.added["building:levels"])).length,
    buildings: recent.filter(e => e.kind === "create").reduce((n, e) => n + e.ways.length, 0)
  };
}
