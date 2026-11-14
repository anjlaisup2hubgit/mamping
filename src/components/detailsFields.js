// The 3D detail boxes on the review screen: height, floors, roof and colours.
// Typing floors fills in the height (and the other way round) if that box is empty.
import { $, esc } from "./dom.js";

const PER_FLOOR = 3.2; // metres, same guess the map uses
const ROOFS = ["flat", "gabled", "hipped", "pyramidal", "skillion", "dome", "round"];
const COLOURS = ["white", "grey", "beige", "yellow", "orange", "red", "brown", "blue", "green", "black"];

export const number = id => { const n = parseFloat($(id).value.replace(",", ".")); return n > 0 ? n : null; }; // blank, text, zero or negative = no value

const box = (id, label, value, mode = "decimal") =>
  `<div style="flex:1"><label for="${id}">${label}</label><input type="text" id="${id}" inputmode="${mode}" value="${value ?? ""}"${id === "rh" ? ' placeholder="Estimate"' : ""}></div>`;
const colour = (id, label) =>
  `<div style="flex:1"><label for="${id}">${label}</label><input type="text" id="${id}" list="colours" placeholder="e.g. white"></div>`;

export const detailsFields = (height, floors) => `
  <div class="row">${box("rh", "Height (m)", height)}${box("rf", "Floors", floors, "numeric")}</div>
  <div class="row"><div style="flex:1"><label for="rs">Roof shape</label><select id="rs"><option value="">Not sure</option>${ROOFS.map(r => `<option>${r}</option>`).join("")}</select></div>${box("rrh", "Roof height (m)", null)}</div>
  <div class="row">${colour("rwc", "Wall colour")}${colour("rrc", "Roof colour")}</div>
  <datalist id="colours">${COLOURS.map(c => `<option value="${esc(c)}">`).join("")}</datalist>`;

// Fills the other box with a guess; a box filled this way keeps updating until the user types in it.
function helper(from, to, guess) {
  $(from).addEventListener("input", () => {
    const t = $(to);
    if (t.value && !t.dataset.auto) return; // the user typed it, leave it alone
    const n = number(from);
    t.value = n ? guess(n) : "";
    t.dataset.auto = n ? "1" : "";
  });
  $(to).addEventListener("input", () => { $(to).dataset.auto = ""; });
}

// onChange runs whenever any box changes (used by the 3D preview).
export function bindDetails(onChange) {
  helper("#rf", "#rh", f => Math.round(f * PER_FLOOR * 10) / 10);
  helper("#rh", "#rf", h => Math.max(1, Math.round(h / PER_FLOOR)));
  ["#rh", "#rf", "#rs", "#rrh", "#rwc", "#rrc"].forEach(id => $(id).addEventListener("input", onChange));
}

// The OpenStreetMap tags for what was typed. Empty boxes are left out.
export const readDetails = () => ({
  height: number("#rh"), "building:levels": number("#rf"),
  "roof:shape": $("#rs").value, "roof:height": number("#rrh"),
  "building:colour": $("#rwc").value.trim().toLowerCase(), "roof:colour": $("#rrc").value.trim().toLowerCase()
});
