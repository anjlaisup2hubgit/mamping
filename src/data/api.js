// Every call to our own server lives here.
import { getSettings } from "./settings.js";
import { getToken } from "./osmAuth.js";

export async function post(url, body) {
  const key = getSettings().geminiKey; // the user's own Gemini key, if they added one
  const headers = { "Content-Type": "application/json", ...(key && { "x-gemini-key": key }) };
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
export const analyzeVideo = body => post("/api/analyze", body);
export const findOutlines = image => post("/api/outline", { image });
export const sendContribution = body => post("/api/contribute", body);

// The user's own saved orange boxes; the server knows who they are from the OpenStreetMap login token.
const osmHeaders = () => ({ "Content-Type": "application/json", Authorization: "Bearer " + getToken() });
export async function getScan() {
  const r = await fetch("/api/scan", { headers: osmHeaders() });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
export async function putScan(boxes) {
  const r = await fetch("/api/scan", { method: "POST", headers: osmHeaders(), body: JSON.stringify({ boxes }) });
  if (!r.ok) throw new Error(r.status);
}

export async function getShared(lat, lng, radius) {
  const r = await fetch(`/api/contributions?lat=${lat}&lng=${lng}&r=${radius}`);
  return r.ok ? r.json() : [];
}
