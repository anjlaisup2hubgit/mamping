// A request may stop waiting immediately when cancelled, even if a device model is finishing its current step.
export function checkCancelled(signal) {
  if (signal?.aborted) throw signal.reason || new DOMException("Scan cancelled.", "AbortError");
}

export function bounded(work, { signal, timeout = 60000, label = "Operation" } = {}) {
  checkCancelled(signal);
  let timer, stopped;
  const limit = new Promise((_, no) => {
    stopped = () => no(signal.reason || new DOMException("Scan cancelled.", "AbortError"));
    signal?.addEventListener("abort", stopped, { once: true });
    timer = setTimeout(() => no(Object.assign(new Error(`${label} timed out. Try again or use fewer pictures.`), { name: "TimeoutError" })), timeout);
  });
  return Promise.race([work, limit]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stopped);
  });
}

// Combine a job cancellation with a per-request deadline; callers release its timer after fetch finishes.
export function requestSignal(signal, timeout = 30000) {
  const controller = new AbortController();
  const stop = () => controller.abort(signal.reason);
  if (signal?.aborted) stop(); else signal?.addEventListener("abort", stop, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("Request timed out.", "TimeoutError")), timeout);
  return { signal: controller.signal, close: () => { clearTimeout(timer); signal?.removeEventListener("abort", stop); } };
}
