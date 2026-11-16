// Lets the tool bar be dragged around the screen by its grip; when let go it snaps to the nearest side.
let spot = null; // where you last dropped the panel, or null = its normal place

const keepOnScreen = (panel, x, y) => {
  const r = panel.getBoundingClientRect();
  return [Math.min(Math.max(0, x), innerWidth - r.width), Math.max(0, Math.min(y, innerHeight - r.height))];
};

function place(panel, x, y, width) {
  Object.assign(panel.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto", margin: "0", transform: "none", width: `${width}px`, maxWidth: "none", maxHeight: `${innerHeight - y - 8}px` }); // scrolls if it opens past the bottom
}

// Slides the panel to the closer left or right side, a small gap from the screen edges.
function snap(panel) {
  const r = panel.getBoundingClientRect(), gap = innerWidth <= 600 ? 8 : 16;
  const x = r.left + r.width / 2 < innerWidth / 2 ? gap : innerWidth - r.width - gap;
  const y = Math.max(gap, Math.min(r.top, innerHeight - r.height - gap));
  panel.style.transition = "left .2s ease, top .2s ease";
  place(panel, x, y, r.width);
  spot = { x, y, width: r.width };
  setTimeout(() => { panel.style.transition = ""; }, 200);
}

// handle = the part you grab; its buttons still work as normal.
export function makeDraggable(panel, handle) {
  if (spot) place(panel, ...keepOnScreen(panel, spot.x, spot.y), spot.width);
  handle.onpointerdown = e => {
    if (e.target.closest("button")) return;
    const r = panel.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    handle.setPointerCapture(e.pointerId);
    handle.onpointermove = m => {
      const [x, y] = keepOnScreen(panel, m.clientX - dx, m.clientY - dy);
      place(panel, x, y, r.width);
      spot = { x, y, width: r.width };
    };
    handle.onpointerup = handle.onpointercancel = () => { handle.onpointermove = null; snap(panel); };
  };
  handle.ondblclick = e => { if (!e.target.closest("button")) { spot = null; panel.removeAttribute("style"); } }; // double-click puts it back
}
