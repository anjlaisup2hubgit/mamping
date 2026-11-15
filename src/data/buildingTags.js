// Drafts may contain unfinished text, but public map tags must be complete and usable.
const NUMBERS = { height: "Height", "building:levels": "Floors", "roof:height": "Roof height" };
const COLOURS = ["building:colour", "roof:colour"];

export function validateBuildingTags(tags = {}) {
  if (!tags || typeof tags !== "object" || Array.isArray(tags)) return "Building details are not valid.";
  for (const [key, value] of Object.entries(tags)) {
    if (value === "" || value == null) continue;
    if (String(value).length > 255) return "Building details must be at most 255 characters each.";
    if (key in NUMBERS) {
      const n = Number(String(value).replace(",", "."));
      if (!Number.isFinite(n) || n <= 0 || (key === "building:levels" && !Number.isInteger(n))) return `${NUMBERS[key]} must be a positive ${key === "building:levels" ? "whole number" : "number in metres"}.`;
    }
    if (COLOURS.includes(key) && !/^(?:[a-z]+(?:[ _-][a-z]+)*|#[\da-f]{3}(?:[\da-f]{3})?)$/i.test(String(value))) return "Use a colour name, such as grey, or a hex colour, such as #808080.";
  }
  return null;
}
