// Finds rough building shapes (in picture pixels) with the AI.
import { findOutlines } from "./api.js";

export async function findBuildings(image) {
  return (await findOutlines(image)).buildings || [];
}
