// Finds rough building shapes (in picture pixels): with the online AI, the free model on this device, or both checking each other.
import { findOutlines, findTrainedRoofs } from "./api.js";
import { dinoFind } from "./dino.js";
import { crossCheck } from "./crossCheck.js";
import { getSettings } from "./settings.js";

const online = async (image, options) => (await findOutlines(image, options)).buildings || [];

export async function findBuildings(image, options = {}) {
  const mode = getSettings().finder;
  if (mode === "trained") return (await findTrainedRoofs(image, options)).buildings || [];
  if (mode === "device") return dinoFind(image, options);
  if (mode !== "both") return online(image, options);
  const [a, b] = await Promise.allSettled([online(image, options), dinoFind(image, options)]);
  if (a.status === "rejected" && b.status === "rejected") throw a.reason; // both failed: show the online AI's reason
  if (a.status === "rejected") console.warn("[scan] online AI failed, using the device model only:", a.reason);
  if (b.status === "rejected") console.warn("[scan] device model failed, using the online AI only:", b.reason);
  return crossCheck(a.value || [], b.value || []);
}
