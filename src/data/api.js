// Every call to our own server lives here.
export async function post(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
export const analyzeVideo = body => post("/api/analyze", body);
export const findOutlines = image => post("/api/outline", { image });
export const sendContribution = body => post("/api/contribute", body);

export async function getShared(lat, lng, radius) {
  const r = await fetch(`/api/contributions?lat=${lat}&lng=${lng}&r=${radius}`);
  return r.ok ? r.json() : [];
}
