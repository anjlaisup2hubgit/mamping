// The panel listing every AI-drawn missing building: tick the ones you checked and add them together,
// remove wrong ones, or draw one the AI missed.
import { $ } from "./dom.js";
import { map, liftIntoView } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { sendOrQueue } from "../data/osmSend.js";
import { overlapsExisting } from "../data/buildings.js";
import { editBox, removeBox, currentBoxes, drawYourself, scanWithAi } from "./missingLayer.js";

const drawBtn = `<button class="big ghost" id="drawSelf" style="min-height:48px">AI missed one? Draw it yourself</button>`;
const aiBtn = `<button class="big ghost" id="aiScan" style="min-height:48px">Scan with our AI instead</button>`;
const short = from => from.split(" ")[0]; // "Microsoft ML Buildings" -> "Microsoft"
const sourceOf = list => [...new Set(list.map(b => b.from).filter(Boolean)), "Esri World Imagery"].join("; ");

export function showBatch(list) {
  if (!list.length) {
    openSheet(`<div><h2>No missing buildings found</h2><p class="mid" style="margin:4px 0 0">If you can see a roof the AI missed, draw it yourself.</p></div>${drawBtn}`);
    $("#drawSelf").onclick = drawYourself;
    return;
  }
  const rows = list.map((b, i) => `<div class="row" style="align-items:center;justify-content:space-between">
    <label style="display:flex;gap:10px;align-items:center;margin:0"><input type="checkbox" class="pick" data-i="${i}">Building ${i + 1}${b.from ? ` · ${short(b.from)}` : b.confidence ? ` · ${Math.round(b.confidence * 100)}% sure` : ""}</label>
    <span class="row" style="gap:6px"><button class="ghost show" data-i="${i}">Show</button><button class="ghost show rm" data-i="${i}" aria-label="Not a building, remove box ${i + 1}" data-tip="Not a building">✕</button></span></div>`).join("");
  const ready = list.some(b => b.from);
  openSheet(`<div><h2>${list.length} missing building${list.length > 1 ? "s" : ""}</h2><p class="mid" style="margin:4px 0 0">${ready ? "Ready-made outlines found by Microsoft's and Google's AI. " : ""}Tick only the ones that match the satellite picture. Tap Show to drag the corners.</p></div>
    <div style="max-height:30vh;overflow:auto">${rows}</div>
    ${osmConfirm()}<button class="big primary" id="addAll" style="min-height:48px">Add ticked buildings to OpenStreetMap</button>${ready ? aiBtn : ""}${drawBtn}`);
  if ($("#aiScan")) $("#aiScan").onclick = scanWithAi;
  document.querySelectorAll(".show:not(.rm)").forEach(b => { b.onclick = () => { const o = list[b.dataset.i]; map.fitBounds(L.polygon(o.coords).getBounds(), { maxZoom: 20 }); editBox(o); liftIntoView(o.center); }; });
  document.querySelectorAll(".rm").forEach(b => { b.onclick = () => { removeBox(list[b.dataset.i]); showBatch(currentBoxes()); }; });
  $("#drawSelf").onclick = drawYourself;
  let warned = false; // the overlap warning shows once; tapping again adds anyway
  $("#addAll").onclick = async () => {
    const picked = [...document.querySelectorAll(".pick:checked")].map(c => list[c.dataset.i]);
    if (!picked.length) return toast("Tick at least one building.");
    if (!osmAllowed()) return;
    const clash = picked.filter(b => overlapsExisting(b.coords)).map(b => list.indexOf(b) + 1);
    if (clash.length && !warned) { warned = true; return toast(`Building ${clash.join(", ")} overlaps one already on the map. Untick it, or tap again to add anyway.`); }
    $("#addAll").disabled = true; // no double send
    try {
      const n = `${picked.length} building${picked.length > 1 ? "s" : ""}`;
      const r = await sendOrQueue({ kind: "create", items: picked.map(b => ({ corners: b.coords, tags: {} })), source: sourceOf(picked),
        comment: picked.some(b => b.from) ? "Add missing buildings from Microsoft/Google outlines, checked against satellite imagery" : "Add missing buildings traced from satellite imagery" });
      toast(r.queued ? `No internet. ${n} will be sent when you are back online.` : `${n} added to OpenStreetMap`);
      picked.forEach(removeBox); // unticked boxes stay, so you can fix them and add them later
      if (currentBoxes().length) showBatch(currentBoxes()); else closeSheet();
    } catch (e) { $("#addAll").disabled = false; toast("Could not reach OpenStreetMap: " + e.message); }
  };
}
