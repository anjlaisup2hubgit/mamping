// Combines videos saved on this phone with ones shared by others.
import { state } from "./state.js";
import { allClips } from "./store.js";
import { getShared } from "./api.js";
import { ONE_MILE } from "./config.js";

export async function loadShared(center) {
  try { state.shared = await getShared(center.lat, center.lng, ONE_MILE); } catch (e) { /* offline is fine */ }
}

export async function loadContribs() {
  let local = [];
  try { local = await allClips(); } catch (e) { /* no storage */ }
  const mine = new Set(local.map(x => x.remoteId).filter(Boolean));
  const others = state.shared.filter(x => x.kind !== "outline" && !mine.has(x.id))
    .map(x => ({ ...x, sent: true, secs: x.secs || 0, at: new Date(x.at).toLocaleString() }));
  state.contribs = [...local, ...others];
}
