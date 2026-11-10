// Shows a button's name next to it the moment the mouse touches it.
const tip = document.createElement("div");
tip.id = "tip";
document.body.appendChild(tip);

const hide = () => { tip.style.display = "none"; };

function show(btn) {
  tip.textContent = btn.dataset.tip;
  tip.style.display = "block";
  const r = btn.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  let x = r.right + 8, y = r.top + (r.height - h) / 2; // default: to the right
  if (r.left + r.width / 2 > innerWidth * 0.8) x = r.left - w - 8; // buttons on the right edge: to the left
  else if (r.top + r.height / 2 > innerHeight * 0.6) { x = r.left + (r.width - w) / 2; y = r.top - h - 10; } // low buttons: above
  tip.style.left = Math.max(4, Math.min(x, innerWidth - w - 4)) + "px";
  tip.style.top = Math.max(4, y) + "px";
}

export function startTooltips() {
  document.addEventListener("pointerover", e => { const b = e.target.closest("[data-tip]"); b ? show(b) : hide(); });
  document.addEventListener("focusin", e => { if (e.target.matches("[data-tip]:focus-visible")) show(e.target); });
  document.addEventListener("focusout", hide);
  document.addEventListener("pointerdown", hide);
}
