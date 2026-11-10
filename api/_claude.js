// Calls Claude with images and returns parsed JSON. Needs ANTHROPIC_API_KEY.
export async function askJSON(images, text, maxTokens = 1200) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const content = images.map(b64 => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }));
  content.push({ type: "text", text: text + "\nReply with one JSON object only." });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5", max_tokens: maxTokens, messages: [{ role: "user", content }] })
  });
  if (!r.ok) throw new Error("Claude error " + r.status);
  const j = await r.json();
  const t = (j.content || []).map(c => c.text || "").join("");
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in reply");
  return JSON.parse(m[0]);
}
export const okImages = a => Array.isArray(a) && a.length > 0 && a.length <= 4 && a.every(s => typeof s === "string" && s.length < 1.5e6);
