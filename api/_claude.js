// Calls Google Gemini with images and returns parsed JSON. Uses the user's own key if sent, else GEMINI_API_KEY.
export async function askJSON(images, text, maxTokens = 1200, userKey = "") {
  const key = userKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Add your Gemini key in Settings (or set GEMINI_API_KEY on the server).");
  const parts = images.map(b64 => ({ inline_data: { mime_type: "image/jpeg", data: b64 } }));
  parts.push({ text: text + "\nReply with one JSON object only." });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"; // plain 3.5-flash has no free quota left (429)
  let r;
  for (let tries = 0; tries < 3; tries++) { // Gemini says 503 when busy: wait a moment and ask again
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens * 4, responseMimeType: "application/json" } })
    });
    if (r.status !== 503) break; // 429 means the key's free quota is used up, so waiting would not help
    await new Promise(ok => setTimeout(ok, 1500 * (tries + 1)));
  }
  if (!r.ok) { console.error("[gemini]", r.status, (await r.text()).slice(0, 300)); throw new Error("Gemini error " + r.status); }
  const j = await r.json();
  const t = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in reply");
  return JSON.parse(m[0]);
}
export const okImages = a => Array.isArray(a) && a.length > 0 && a.length <= 4 && a.every(s => typeof s === "string" && s.length < 1.5e6);
