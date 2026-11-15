// A lasting job strip keeps scan progress and cancellation within reach while the map stays editable.
let strip = null, timer = null, latest = null, started = 0, active = false;

function paint() {
  if (!strip || !latest) return;
  const seconds = Math.floor((Date.now() - started) / 1000);
  strip.querySelector("span").textContent = `${latest.text} · ${seconds}s`;
}
export function showScanProgress(text, { cancel, retry, done = false } = {}) {
  if (cancel && !active) started = Date.now();
  active = !!cancel;
  if (!strip) {
    strip = document.createElement("div");
    strip.id = "scanProgress";
    strip.className = "scanProgress";
    strip.setAttribute("role", "status");
    strip.style.cssText = "position:fixed;top:120px;left:12px;right:12px;max-width:480px;margin:auto;z-index:850;display:flex;align-items:center;gap:8px;background:var(--surf);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:8px 12px;box-shadow:0 1px 4px #0003;font-size:13px";
    const label = document.createElement("span");
    label.style.flex = "1";
    strip.append(label);
    document.body.append(strip);
    started = Date.now();
  }
  latest = { text };
  strip.querySelectorAll("button").forEach(b => b.remove());
  const button = (title, action) => {
    const b = document.createElement("button");
    b.textContent = title; b.className = "ghost pill"; b.style.minHeight = "40px";
    b.onclick = action; strip.append(b);
  };
  if (cancel) { button("Cancel", cancel); strip.lastChild.setAttribute("aria-label", "Cancel scan"); }
  if (retry) button("Retry failed", retry);
  if (done) button("Dismiss", hideScanProgress);
  clearInterval(timer);
  if (!done) timer = setInterval(paint, 1000);
  paint();
}
export function hideScanProgress() {
  clearInterval(timer); timer = null; strip?.remove(); strip = null; latest = null; active = false;
}
