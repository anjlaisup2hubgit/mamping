// Search box on the map: type a place, tap a result, the map moves there.
import { searchPlaces } from "../data/search.js";
import { $, esc } from "./dom.js";
import { centerOn, map } from "./mapView.js";
import { toast } from "./toast.js";

export const searchBar = () => `<div class="search"><input type="text" id="q" placeholder="Search a place" aria-label="Search a place" autocomplete="off"><div class="results" id="results"></div></div>`;

export function bindSearch() {
  let timer = null, latest = 0; // latest = number of the newest search, so a slow old answer is ignored
  // The search icon in the bottom bar shows or hides the real search box.
  $("#searchB").onclick = () => {
    const box = $(".search");
    box.classList.toggle("open");
    if (box.classList.contains("open")) $("#q").focus();
  };
  const run = async () => {
    const q = $("#q").value.trim();
    if (q.length < 3) { $("#results").innerHTML = q ? '<button disabled>Type at least 3 letters</button>' : ""; return; }
    const mine = ++latest;
    $("#results").innerHTML = '<button disabled>Searching…</button>';
    try {
      const c = map.getCenter();
      const list = await searchPlaces(q, [c.lat, c.lng]);
      if (mine !== latest) return;
      $("#results").innerHTML = list.length ? list.map((p, i) => `<button data-i="${i}">${esc(p.label)}</button>`).join("") : '<button disabled>No places found</button>';
      $("#results").querySelectorAll("[data-i]").forEach(b => {
        b.onclick = () => { const p = list[+b.dataset.i]; centerOn([p.lat, p.lng], 17); $("#results").innerHTML = ""; $("#q").value = p.label.split(",")[0]; };
      });
    } catch (e) { if (mine === latest) { $("#results").innerHTML = ""; toast("Search is not available right now."); } }
  };
  // Tapping anywhere else closes the search box.
  const closeOutside = e => {
    const box = $(".search");
    if (!box) { document.removeEventListener("pointerdown", closeOutside); return; }
    if (!e.target.closest(".search, #searchB")) box.classList.remove("open");
  };
  document.addEventListener("pointerdown", closeOutside);
  $("#q").oninput = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
  $("#q").onkeydown = e => { if (e.key === "Enter") { clearTimeout(timer); run(); } };
}
