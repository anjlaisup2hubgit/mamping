// Calls Google Gemini with images and returns parsed JSON, with errors the user can act on.
const failure = (status, code, message) => Object.assign(new Error(message), { status, code });
const upstreamError = status => {
  if (status === 401 || status === 403) return failure(401, "KEY_REFUSED", "Your Gemini key was refused. Check it in Scan options.");
  if (status === 429) return failure(429, "QUOTA_EXHAUSTED", "Gemini quota is used up. Wait for it to reset or choose On this device in Scan options.");
  if (status === 404) return failure(404, "MODEL_UNAVAILABLE", "The configured Gemini model is unavailable. Check GEMINI_MODEL on the server.");
  if (status === 503) return failure(503, "AI_BUSY", "Gemini is busy. Retry this picture in a moment.");
  return failure(502, "AI_UNAVAILABLE", "Gemini could not read this picture. Retry it or choose On this device in Scan options.");
};

const pause = (ms, signal) => new Promise((ok, no) => {
  signal.throwIfAborted();
  const stop = () => { clearTimeout(timer); no(signal.reason); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", stop); ok(); }, ms);
  signal.addEventListener("abort", stop, { once: true });
});

export async function askJSON(images, text, maxTokens = 1200, userKey = "", signal) {
  const key = userKey || process.env.GEMINI_API_KEY;
  if (!key) throw failure(503, "MISSING_KEY", "Add your Gemini key in Scan options, or choose On this device.");
  const deadline = AbortSignal.timeout(60000);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const parts = images.map(b64 => ({ inline_data: { mime_type: "image/jpeg", data: b64 } }));
  parts.push({ text: text + "\nReply with one JSON object only." });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"; // plain 3.5-flash has no free quota left (429)
  try {
    let r;
    for (let tries = 0; tries < 3; tries++) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", signal: requestSignal,
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens * 4, responseMimeType: "application/json" } })
      });
      if (r.status !== 503 || tries === 2) break;
      await pause(1000 * (tries + 1), requestSignal);
    }
    if (!r.ok) {
      // Google sometimes reports an invalid key as 400 rather than 401.
      if (r.status === 400) {
        const body = await r.json().catch(() => null);
        if (body?.error?.details?.some(d => d.reason === "API_KEY_INVALID")) throw upstreamError(401);
      }
      throw upstreamError(r.status); // never log the upstream body or a user's key
    }
    let j;
    try { j = await r.json(); } catch { throw failure(502, "INVALID_AI_RESPONSE", "Gemini returned an unreadable reply. Retry this picture."); }
    const reply = j?.candidates?.[0]?.content?.parts;
    const t = Array.isArray(reply) ? reply.map(p => p.text || "").join("") : "";
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) throw failure(502, "INVALID_AI_RESPONSE", "Gemini returned no building facts. Retry this picture.");
    try { return JSON.parse(m[0]); } catch { throw failure(502, "INVALID_AI_RESPONSE", "Gemini returned incomplete building facts. Retry this picture."); }
  } catch (e) {
    if (signal?.aborted) throw failure(499, "CANCELLED", "Scan cancelled.");
    if (deadline.aborted) throw failure(504, "AI_TIMEOUT", "Gemini took too long. Retry this picture or choose On this device.");
    if (e.status) throw e;
    throw failure(502, "AI_CONNECTION", "Could not connect to Gemini. Check your connection and retry this picture.");
  }
}
export const okImages = a => Array.isArray(a) && a.length > 0 && a.length <= 4 && a.every(s => typeof s === "string" && s.length > 0 && s.length < 1.5e6);
