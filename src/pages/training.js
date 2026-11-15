// Training: check each picture saved for AI training. Tap a wrong roof to remove it, drag to add a missed one, then keep or drop the picture.
import { header, bindBack } from "../components/header.js";
import { toast } from "../components/toast.js";
import { getTraining, checkTraining } from "../data/api.js";
import { bindTrain, stopTrain } from "../components/trainButton.js";

const empty = `<div class="empty"><h2>No training pictures</h2><p class="mid" style="margin:0">Scan an area on the map, then save the kept buildings for AI training.</p></div>`;

let pics = [], at = 0, off = new Set(); // off = the roofs removed from the picture on screen
let dragged = false; // true right after drawing a roof, so the end of the drag does not also count as a tap

const roofsOf = p => p.labels.split("\n").filter(Boolean);

// One roof is a label line "0 x-middle y-middle width height" (all 0 to 1), drawn as a box over the picture.
function roofBox(line, i) {
  const [, x, y, w, h] = line.split(" ").map(Number);
  return `<rect data-i="${i}" class="${off.has(i) ? "off" : ""}" x="${(x - w / 2) * 100}" y="${(y - h / 2) * 100}" width="${w * 100}" height="${h * 100}"/>`;
}

// Dragging on the picture draws a new roof box; done(line) gets its label line once the finger lifts.
function letDraw(svg, done) {
  let from = null, box = null, size = null;
  const spot = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100]; };
  const stop = () => { if (box) box.remove(); from = box = size = null; };
  svg.onpointerdown = e => { from = spot(e); dragged = false; };
  svg.onpointermove = e => {
    if (!from) return;
    const [x, y] = spot(e), w = Math.abs(x - from[0]), h = Math.abs(y - from[1]);
    if (w < 1.5 || h < 1.5) return; // too small to be a roof: still a tap
    if (!box) { box = svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "rect")); box.classList.add("new"); }
    size = { x: Math.min(x, from[0]), y: Math.min(y, from[1]), width: w, height: h };
    for (const k in size) box.setAttribute(k, size[k]);
  };
  svg.onpointerup = () => {
    const s = size;
    stop();
    if (!s) return;
    dragged = true;
    done(`0 ${((s.x + s.width / 2) / 100).toFixed(6)} ${((s.y + s.height / 2) / 100).toFixed(6)} ${(s.width / 100).toFixed(6)} ${(s.height / 100).toFixed(6)}`);
  };
  svg.onpointerleave = svg.onpointercancel = stop;
}

function draw(el) {
  const body = el.querySelector("#train");
  if (!pics.length) { body.innerHTML = empty; return; }
  const p = pics[at], roofs = roofsOf(p), checked = pics.filter(x => x.status).length;
  body.innerHTML = `
    <div class="row" style="align-items:center"><button class="round" id="prev" aria-label="Previous picture">‹</button>
      <span class="rcount" style="text-align:center">${at + 1} / ${pics.length}${p.status ? ` <span class="tag">${p.status}</span>` : ""}</span>
      <button class="round" id="next" aria-label="Next picture">›</button></div>
    <div class="bar"><i style="width:${checked / pics.length * 100}%"></i></div>
    <div class="tpic"><img src="/training/images/${p.name}.jpg" alt="Satellite picture"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${roofs.map(roofBox).join("")}</svg></div>
    <p class="mid" style="margin:0;text-align:center"><span id="roofN">${roofs.length - off.size}</span> roofs · tap to remove, drag to add</p>
    <div class="row"><button class="big ghost" id="drop">Drop</button><button class="big primary" id="keep">Keep</button></div>`;
  body.querySelectorAll("rect").forEach(r => {
    r.onclick = () => {
      if (dragged) return;
      const i = +r.dataset.i;
      off.has(i) ? off.delete(i) : off.add(i);
      r.classList.toggle("off");
      body.querySelector("#roofN").textContent = roofs.length - off.size;
    };
  });
  letDraw(body.querySelector("svg"), line => { p.labels = roofs.concat(line).join("\n") + "\n"; draw(el); });
  body.querySelector("#prev").onclick = () => show(el, (at + pics.length - 1) % pics.length);
  body.querySelector("#next").onclick = () => show(el, (at + 1) % pics.length);
  body.querySelector("#drop").onclick = () => check(el, "dropped");
  body.querySelector("#keep").onclick = () => check(el, "kept");
}

function show(el, i) { at = i; off = new Set(); draw(el); }

// Saves the choice, then moves to the next picture that is not checked yet.
async function check(el, status) {
  const p = pics[at], labels = roofsOf(p).filter((_, i) => !off.has(i)).join("\n") + "\n";
  try { await checkTraining(p.name, status, status === "kept" ? labels : undefined); }
  catch { return toast("Could not save your choice."); }
  p.status = status;
  if (status === "kept") p.labels = labels;
  const later = pics.findIndex((x, i) => i > at && !x.status), next = later < 0 ? pics.findIndex(x => !x.status) : later;
  if (next < 0) toast(`All checked: ${pics.filter(x => x.status === "kept").length} kept.`);
  show(el, next < 0 ? at : next);
}

export const training = {
  async open(el) {
    el.innerHTML = header("Training") + `<div class="pad scroll" id="train"></div><div class="pad" id="trainBox" style="padding-bottom:16px"></div>`;
    bindBack(el, "settings");
    pics = await getTraining().catch(() => []);
    const first = pics.findIndex(x => !x.status);
    show(el, first < 0 ? 0 : first);
    if (pics.length) bindTrain(el.querySelector("#trainBox"));
  },
  close: stopTrain
};
