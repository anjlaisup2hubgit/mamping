// The panel listing every missing building: tick the ones you checked and add them together,
// remove wrong ones, or (under More) draw one the AI missed. Row numbers match the numbers on the map.
import { $ } from "./dom.js";
import { map, liftIntoView } from "./mapView.js";
import { openSheet, closeSheet } from "./sheet.js";
import { toast } from "./toast.js";
import { osmConfirm, osmAllowed } from "./osmConfirm.js";
import { sendOrQueue } from "../data/osmSend.js";
import { overlapsExisting } from "../data/buildings.js";
import { startRemoving } from "./removeMode.js";
import { focusBox, removeBox, currentBoxes, drawYourself, scanWithAi, saveForTraining } from "./missingLayer.js";

const drawBtn = `<button class="big ghost" id="drawSelf" style="min-height:48px">AI missed one? Draw it yourself</button>`;
const trainBtn = `<button class="big ghost" id="saveTrain" style="min-height:48px">Save ticked for AI training</button>`;
const aiBtn =`<button class="big ghost" id="aiScan" style="min-height:48px">Scan with our AI instead</button>`;
const short = from => from.split(" ")[0]; // "Microsoft ML Buildings" -> "Microsoft"
const sourceOf = list => [...new Set(list.map(b => b.from).filter(Boolean)), "Esri World Imagery"].join("; ");
const label = b => b.from ? short(b.from) : b.confidence ? `${Math.round(b.confidence * 100)}% sure` : "drawn by you";

const row = (b, i) => `<div class="mrow" data-i="${i}">
  <input type="checkbox" class="pick" data-i="${i}" aria-label="Building ${i + 1} matches the picture">
  <span class="num">${i + 1}</span><span class="mname">Building ${i + 1}<small class="mid">${label(b)}</small></span>
  <button class="ghost show rm" data-i="${i}" aria-label="Not a building, remove box ${i + 1}" data-tip="Not a building">✕</button></div>`;

export function showBatch(list) {
  if (!list.length) {
    openSheet(`<div><h2>No missing buildings found</h2><p class="mid" style="margin:4px 0 0">If you can see a roof the AI missed, draw it yourself.</p></div>${drawBtn}`);
    $("#drawSelf").onclick = drawYourself;
    return;
  }
  const ready = list.some(b => b.from);
  openSheet(`<div><h2>${list.length} missing building${list.length > 1 ? "s" : ""}</h2><p class="mid" style="margin:2px 0 0;font-size:14px">Tick the ones that match the picture. Tap a row to see it.</p></div>
    <div class="mlist">${list.map(row).join("")}</div>
    <div id="confirmWrap" hidden>${osmConfirm()}</div>
    <div class="row"><button class="big primary" id="addAll" style="min-height:48px;flex:1;font-size:16px"></button><button class="ghost pill" id="rmMany">Remove several</button><button class="ghost pill" id="moreB" aria-expanded="false">More</button></div>
    <div id="moreMenu" class="moreMenu" hidden>${ready ? aiBtn : ""}${drawBtn}${trainBtn}</div>`);
  const picks = () => [...document.querySelectorAll(".pick:checked")].map(c => list[c.dataset.i]);
  const count = () => { const n = picks().length; $("#addAll").textContent = n ? `Add ${n} ticked to OpenStreetMap` : "Tick buildings to add"; };
  count();
  document.querySelectorAll(".pick").forEach(c => { c.onchange = count; });
  document.querySelectorAll(".mrow").forEach(r => {
    r.onclick = e => {
      if (e.target.closest(".pick, .rm")) return; // ticking or removing is not "show me"
      const o = list[r.dataset.i];
      document.querySelectorAll(".mrow").forEach(x => x.classList.toggle("on", x === r));
      map.fitBounds(L.polygon(o.coords).getBounds(), { maxZoom: 20 });
      focusBox(o);
      liftIntoView(o.center);
    };
  });
  document.querySelectorAll(".rm").forEach(b => { b.onclick = () => { removeBox(list[b.dataset.i]); showBatch(currentBoxes()); }; });
  $("#rmMany").onclick = startRemoving;
  $("#moreB").onclick = () => { const m = $("#moreMenu"); m.hidden = !m.hidden; $("#moreB").setAttribute("aria-expanded", !m.hidden); };
  if ($("#aiScan")) $("#aiScan").onclick = scanWithAi;
  $("#drawSelf").onclick = drawYourself;
  $("#saveTrain").onclick = () => picks().length ? saveForTraining(picks()) : toast("Tick the buildings that match the picture first.");
  let warned = false; // the overlap warning shows once; tapping again adds anyway
  $("#addAll").onclick = async () => {
    const picked = picks();
    if (!picked.length) return toast("Tick at least one building.");
    if ($("#confirmWrap").hidden) { $("#confirmWrap").hidden = false; return toast("Tick the box to confirm you checked them, then tap Add again."); }
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
