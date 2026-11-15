// A public hosted app must not let anonymous visitors train or replace the shared detector.
export async function trainingWriteAllowed(req, res) {
  if (req.method !== "POST" || new URL(req.url, "http://localhost").pathname === "/api/detect") return true;
  const editors = (process.env.TRAINING_EDITOR_IDS || "").split(",").map(v => v.trim()).filter(v => /^\d+$/.test(v));
  if (!editors.length) { res.status(503).json({ error: "Configure TRAINING_EDITOR_IDS with the OpenStreetMap accounts allowed to manage training.", code: "TRAINING_EDITORS_MISSING" }); return false; }
  const authorization = req.headers?.authorization;
  if (!authorization?.startsWith("Bearer ")) { res.status(401).json({ error: "Log in to OpenStreetMap to edit training scenes or manage models.", code: "TRAINING_LOGIN_REQUIRED" }); return false; }
  try {
    const reply = await fetch("https://api.openstreetmap.org/api/0.6/user/details.json", { headers: { Authorization: authorization }, signal: AbortSignal.timeout(10000) });
    if (reply.ok && editors.includes(String((await reply.json()).user?.id))) return true;
    res.status(403).json({ error: "This OpenStreetMap account is not a configured training editor.", code: "TRAINING_EDITOR_REQUIRED" });
  } catch { res.status(503).json({ error: "OpenStreetMap could not verify the training editor. Your draft is still saved; try again.", code: "TRAINING_ACCOUNT_UNAVAILABLE" }); }
  return false;
}
