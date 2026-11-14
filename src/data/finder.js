// Finds rough building shapes (in picture pixels): with the online AI, the free model on this device, or both checking each other.
import { findOutlines } from "./api.js";
import { dinoFind } from "./dino.js";
import { crossCheck } from "./crossCheck.js";
import { getSettings } from "./settings.js";

const online = async image => (await findOutlines(image)).buildings || [];

export async function findBuildings(image) {
  const mode = getSettings().finder;
  if (mode === "device") return dinoFind(image);
  if (mode !== "both") return online(image);
  const [a, b] = await Promise.allSettled([online(image), dinoFind(image)]);
  if (a.status === "rejected" && b.status === "rejected") throw a.reason; // both failed: show the online AI's reason
  if (a.status === "rejected") console.warn("[scan] online AI failed, using the device model only:", a.reason);
  if (b.status === "rejected") console.warn("[scan] device model failed, using the online AI only:", b.reason);
  return crossCheck(a.value || [], b.value || []);
}
