// Hosted functions forward training to a persistent, authenticated workstation; tokens stay on the server.
import { trainingWriteAllowed } from "./_trainingAccess.js";
export async function forwardTraining(req, res) {
  const configured = process.env.TRAINING_WORKER_URL;
  if (!configured) return false;
  let base;
  try {
    base = new URL(configured);
    if (!["https:", "http:"].includes(base.protocol) || base.username || base.password ||
      (base.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) throw new Error();
  } catch { res.status(503).json({ error: "Configure an HTTPS training worker URL (HTTP is allowed only on localhost).", code: "BAD_TRAINING_WORKER" }); return true; }
  const token = process.env.TRAINING_WORKER_TOKEN;
  if (!token) { res.status(503).json({ error: "Set the training worker token securely on both servers.", code: "TRAINING_WORKER_TOKEN_MISSING" }); return true; }
  if (!await trainingWriteAllowed(req, res)) return true;
  const source = new URL(req.url, "http://localhost");
  const destination = new URL(source.pathname + source.search, base);
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, 90000);
  req.once?.("aborted", abort);
  res.once?.("close", () => { if (!res.writableEnded) abort(); });
  try {
    const upstream = await fetch(destination, {
      method: req.method, signal: controller.signal, redirect: "error",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(["GET", "HEAD"].includes(req.method) ? {} : { body: JSON.stringify(req.body || {}) })
    });
    res.status(upstream.status);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    if ((upstream.headers.get("content-type") || "").includes("application/json")) {
      const data = await upstream.json();
      if (data?.capabilities) data.capabilities = { ...data.capabilities, localOnly: false, workerConnected: true };
      res.end(JSON.stringify(data));
    } else res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    if (!res.writableEnded) res.status(503).json({ error: "The training worker could not be reached. Check its address, token and connection.", code: "TRAINING_WORKER_UNAVAILABLE" });
  } finally { clearTimeout(timer); req.removeListener?.("aborted", abort); }
  return true;
}
