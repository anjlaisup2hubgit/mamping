// Search box on the map: type a place, tap a result, the map moves there.
import { searchPlaces } from "../data/search.js";
import { $, esc } from "./dom.js";
import { centerOn } from "./mapView.js";
import { toast } from "./toast.js";

export const searchBar = () => `<div class="search"><input type="text" id="q" placeholder="Search a place" aria-label="Search a place" autocomplete="off"><div class="results" id="results"></div></div>`;

export function bindSearch() {
  let timer = null;
  const run = async () => {
    const q = $("#q").value.trim();
    if (q.length < 3) { $("#results").innerHTML = ""; return; }
    try {
      const list = await searchPlaces(q);
      $("#results").innerHTML = list.length ? list.map((p, i) => `<button data-i="${i}">${esc(p.label)}</button>`).join("") : '<button disabled>No places found</button>';
      $("#results").querySelectorAll("[data-i]").forEach(b => {
        b.onclick = () => { const p = list[+b.dataset.i]; centerOn([p.lat, p.lng], 17); $("#results").innerHTML = ""; $("#q").value = p.label.split(",")[0]; };
      });
    } catch (e) { toast("Search is not available right now."); }
  };
  $("#q").oninput = () => { clearTimeout(timer); timer = setTimeout(run, 500); };
  $("#q").onkeydown = e => { if (e.key === "Enter") { clearTimeout(timer); run(); } };
}
