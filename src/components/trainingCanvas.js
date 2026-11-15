// A zoomable label editor: move/resize a selected roof, draw one, or pan without changing labels.
const clamp = v => Math.max(0, Math.min(1, v));
const boxesOf = labels => labels.split("\n").filter(Boolean).map(line => {
  const [, x, y, w, h] = line.trim().split(/\s+/).map(Number);
  return { x: x - w / 2, y: y - h / 2, w, h };
});
const labelsOf = boxes => boxes.map(b => `0 ${(b.x + b.w / 2).toFixed(6)} ${(b.y + b.h / 2).toFixed(6)} ${b.w.toFixed(6)} ${b.h.toFixed(6)}`).join("\n");
const rectangle = (a, b) => ({ x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) });

export function trainingCanvas(el, picture, history, changed) {
  let boxes = boxesOf(picture.labels), selected = -1, mode = "adjust", drag = null, zoom = 1, pan = [0, 0];
  el.innerHTML = `<div class="trainingTools" aria-label="Label tools">
    <button class="ghost pill on" data-mode="adjust">Adjust</button><button class="ghost pill" data-mode="draw">Draw</button>
    <button class="ghost pill" data-mode="pan">Pan</button><button class="ghost pill" data-label-act="remove">Remove</button>
    <button class="ghost pill" data-label-act="undo">Undo</button><button class="ghost pill" data-label-act="redo">Redo</button>
    <button class="ghost pill" data-label-act="out" aria-label="Zoom out">−</button><button class="ghost pill" data-label-act="in" aria-label="Zoom in">+</button>
    <button class="ghost pill" data-label-act="fit">Fit</button></div>
    <div class="trainingViewport" tabindex="0" aria-label="Training picture editor: select a roof to move or resize it">
      <div class="trainingWorld"><img alt="Satellite picture"><svg viewBox="0 0 100 100" preserveAspectRatio="none"></svg></div></div>
    <p class="mid trainingHint"><span id="roofN"></span> roofs · select to resize; Draw adds a roof; Pan moves the picture</p>`;
  el.querySelector("img").src = "/api/training-image?name=" + encodeURIComponent(picture.name);
  const svg = el.querySelector("svg"), viewport = el.querySelector(".trainingViewport"), world = el.querySelector(".trainingWorld");
  const redraw = () => {
    svg.innerHTML = boxes.map((b, i) => `<rect data-i="${i}" class="${i === selected ? "selected" : ""}" x="${b.x * 100}" y="${b.y * 100}" width="${b.w * 100}" height="${b.h * 100}"/>`).join("");
    const b = boxes[selected];
    if (b) [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].forEach(([x, y], i) => {
      svg.insertAdjacentHTML("beforeend", `<circle data-corner="${i}" cx="${x * 100}" cy="${y * 100}" r="${1.5 / zoom}"/>`);
    });
    el.querySelector("#roofN").textContent = boxes.length;
    el.querySelector('[data-label-act="remove"]').disabled = selected < 0;
    el.querySelector('[data-label-act="undo"]').disabled = !history.past.length;
    el.querySelector('[data-label-act="redo"]').disabled = !history.future.length;
    world.style.transform = `translate(${pan[0]}px,${pan[1]}px) scale(${zoom})`;
  };
  const commit = before => {
    const labels = labelsOf(boxes);
    if (before === labels) return redraw();
    history.past.push(before); history.future = [];
    if (history.past.length > 50) history.past.shift();
    picture.labels = labels; changed(labels); redraw();
  };
  const spot = e => {
    const r = svg.getBoundingClientRect();
    return [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)];
  };
  const scale = factor => {
    const next = Math.max(1, Math.min(6, zoom * factor)), ratio = next / zoom;
    const w = viewport.clientWidth, h = viewport.clientHeight;
    pan = [(pan[0] - w / 2) * ratio + w / 2, (pan[1] - h / 2) * ratio + h / 2];
    zoom = next;
    if (zoom === 1) pan = [0, 0];
    redraw();
  };
  const action = act => {
    if (act === "in" || act === "out") return scale(act === "in" ? 1.4 : 1 / 1.4);
    if (act === "fit") { zoom = 1; pan = [0, 0]; return redraw(); }
    if (act === "remove" && selected >= 0) { const before = labelsOf(boxes); boxes.splice(selected, 1); selected = -1; return commit(before); }
    const source = act === "undo" ? history.past : history.future, target = act === "undo" ? history.future : history.past;
    if (!source.length) return;
    target.push(labelsOf(boxes)); picture.labels = source.pop(); boxes = boxesOf(picture.labels); selected = -1;
    changed(picture.labels); redraw();
  };
  el.querySelectorAll("[data-label-act]").forEach(b => { b.onclick = () => action(b.dataset.labelAct); });
  el.querySelectorAll("[data-mode]").forEach(b => { b.onclick = () => {
    mode = b.dataset.mode;
    el.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("on", x === b));
    viewport.dataset.mode = mode;
  }; });
  svg.onpointerdown = e => {
    if (e.button !== 0) return;
    viewport.focus({ preventScroll: true });
    const start = spot(e), before = labelsOf(boxes), corner = e.target.closest("[data-corner]");
    const hit = e.target.closest("[data-i]");
    if (mode === "pan") drag = { kind: "pan", pointer: [e.clientX, e.clientY], pan: [...pan] };
    else if (mode === "draw") { selected = boxes.length; boxes.push({ x: start[0], y: start[1], w: 0, h: 0 }); drag = { kind: "draw", start, before }; }
    else if (corner && selected >= 0) {
      const b = boxes[selected], corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
      drag = { kind: "resize", anchor: corners[(Number(corner.dataset.corner) + 2) % 4], before };
    } else if (hit) { selected = Number(hit.dataset.i); drag = { kind: "move", start, box: { ...boxes[selected] }, before }; }
    else selected = -1;
    svg.setPointerCapture(e.pointerId); e.preventDefault(); redraw();
  };
  svg.onpointermove = e => {
    if (!drag) return;
    const point = spot(e);
    if (drag.kind === "pan") pan = [drag.pan[0] + e.clientX - drag.pointer[0], drag.pan[1] + e.clientY - drag.pointer[1]];
    else if (drag.kind === "draw") boxes[selected] = rectangle(drag.start, point);
    else if (drag.kind === "resize") boxes[selected] = rectangle(drag.anchor, point);
    else {
      const b = drag.box;
      boxes[selected] = { ...b, x: Math.max(0, Math.min(1 - b.w, b.x + point[0] - drag.start[0])), y: Math.max(0, Math.min(1 - b.h, b.y + point[1] - drag.start[1])) };
    }
    redraw();
  };
  const finish = e => {
    if (!drag) return;
    const { before, kind } = drag; drag = null;
    if (kind !== "pan") {
      const b = boxes[selected];
      if (b && (b.w < .005 || b.h < .005)) { boxes = boxesOf(before); selected = -1; }
      commit(before);
    }
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
  };
  svg.onpointerup = finish;
  svg.onpointercancel = e => { if (drag?.before !== undefined) boxes = boxesOf(drag.before); drag = null; redraw(); };
  viewport.onwheel = e => { e.preventDefault(); scale(e.deltaY < 0 ? 1.15 : 1 / 1.15); };
  viewport.onkeydown = e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); return action(e.shiftKey ? "redo" : "undo"); }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); return action("remove"); }
    if (e.key === "+" || e.key === "=") { e.preventDefault(); return scale(1.4); }
    if (e.key === "-") { e.preventDefault(); return scale(1 / 1.4); }
    const move = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
    if (move) { e.preventDefault(); pan = [pan[0] + move[0], pan[1] + move[1]]; redraw(); }
  };
  redraw();
}
