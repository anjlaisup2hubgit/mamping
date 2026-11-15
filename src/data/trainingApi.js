// Training uses local files and a local worker; report server errors instead of hiding them.
import { getToken } from "./osmAuth.js";
async function request(url, body) {
  const token = getToken(), headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" };
  const r = await fetch(url, { headers, ...(body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Training request failed (${r.status}).`);
  return data;
}

export const listTraining = () => request("/api/training");
export const writeTraining = body => request("/api/training", body);
export const readTrain = () => request("/api/train");
export const beginTrain = () => request("/api/train", {});
export const readModels = () => request("/api/models");
export const changeModel = body => request("/api/models", body);
