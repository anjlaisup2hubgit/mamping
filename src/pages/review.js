// Review: confirm name, height and comment, then upload or keep offline.
import { state } from "../data/state.js";
import { heightOf } from "../data/buildings.js";
import { saveClip } from "../data/store.js";
import { shareClip } from "../data/upload.js";
import { loadContribs } from "../data/contributions.js";
import { $, esc } from "../components/dom.js";
import { go } from "../components/router.js";
import { header, bindBack } from "../components/header.js";
import { centerOn } from "../components/mapView.js";
import { refreshStyles } from "../components/buildingLayer.js";
import { showBuilding } from "../components/buildingSheet.js";
import { toast } from "../components/toast.js";

const number = id => parseFloat($(id).value.replace(",", ".")) || null;

function form() {
  const b = state.match, ai = state.ai;
  const h = ai?.heightM || (b ? heightOf(b) : null);
  const floors = ai?.floors || b?.levels;
  const tag = !b ? "No building found nearby" : ai ? "Matched by AI · " + Math.round((ai.confidence || 0) * 100) + "%" : "Matched by location";
  return `<div class="pad scroll"><div class="row" style="align-items:center"><span class="tag">${tag}</span></div>${ai?.note ? `<p class="mid" style="margin:0">${esc(ai.note)}</p>` : ""}
    <div><label for="rn">Building name</label><input type="text" id="rn" value="${esc(ai?.name || b?.name || "")}" placeholder="Add a name"></div>
    <div class="row"><div style="flex:1"><label for="rh">Height (m)</label><input type="text" id="rh" inputmode="decimal" value="${h ?? ""}" placeholder="Estimate"></div><div style="flex:1"><label for="rf">Floors</label><input type="text" id="rf" inputmode="numeric" value="${floors ?? ""}"></div></div>
    <div><label for="rc">Add comment</label><input type="text" id="rc" placeholder="New café!"></div>
    <label class="big ghost" style="margin:0;color:var(--ink);font-size:16px;min-height:52px"><input type="file" id="rp" accept="image/*" hidden><span id="rpl">+ Add photo</span></label></div>
    <div class="pad" style="padding-top:8px;padding-bottom:max(18px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:8px;max-width:520px;width:100%;margin:0 auto"><button class="big primary" id="uploadNow">Upload now</button><button class="big ghost" id="keepOff" style="min-height:48px">Keep offline</button></div>`;
}

function readForm(clip) {
  clip.buildingId = state.match ? state.match.id : null;
  clip.name = $("#rn").value.trim();
  clip.height = number("#rh");
  clip.levels = number("#rf");
  clip.comment = $("#rc").value.trim();
  clip.lat = clip.track[0]?.lat;
  clip.lng = clip.track[0]?.lng;
}

async function finish(send) {
  const clip = state.clip;
  readForm(clip);
  if (send) {
    try {
      toast("Uploading…");
      clip.remoteId = await shareClip(clip);
      clip.sent = true;
      toast("Sent to map");
    } catch (e) { toast("Upload failed. Kept on this phone."); }
  } else toast("Saved on this phone only");
  await saveClip(clip);
  await loadContribs();
  refreshStyles();
  go("home");
  if (state.match) { centerOn(state.match.center); showBuilding(state.match.id); }
}

export const review = {
  open(el) {
    el.innerHTML = header("Review") + form();
    bindBack(el, "saved");
    $("#rp").onchange = e => {
      const f = e.target.files[0];
      if (f) { state.clip.photo = f; $("#rpl").textContent = "Photo added ✓"; }
    };
    $("#uploadNow").onclick = () => finish(true);
    $("#keepOff").onclick = () => finish(false);
  }
};
