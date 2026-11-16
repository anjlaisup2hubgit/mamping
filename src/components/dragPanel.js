// Lets the tool bar be dragged anywhere on the screen by its grip.
let spot = null; // where you last dropped the panel, or null = its normal place

const keepOnScreen = (panel, x, y) => {
  const r = panel.getBoundingClientRect();
  return [Math.min(Math.max(0, x), innerWidth - r.width), Math.max(0, Math.min(y, innerHeight - r.height))];
};

function place(panel, x, y, width) {
  Object.assign(panel.style, { left: `${x}px`, top: `${y}px`, right: "auto", bottom: "auto", margin: "0", transform: "none", width: `${width}px`, maxWidth: "none", maxHeight: `${innerHeight - y - 8}px` }); // scrolls if it opens past the bottom
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
    handle.onpointerup = handle.onpointercancel = () => { handle.onpointermove = null; }; // it stays exactly where you let go
  };
  handle.ondblclick = e => { if (!e.target.closest("button")) { spot = null; panel.removeAttribute("style"); } }; // double-click puts it back
}
