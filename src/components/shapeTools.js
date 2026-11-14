// Small buttons that float next to the building being fixed: make it a rectangle, line it up with a street, undo, copy it.
// They follow the shape as its corners are dragged, and go away when editing stops.
import { map } from "./mapView.js";
import { squareShape, undoShape, watchShape, lineUpShape } from "./cornerEditor.js";
import { addBox, unfocus } from "./missingLayer.js";
import { startCopying } from "./copyShape.js";
import { pickStreet } from "./streetPicker.js";
import { toast } from "./toast.js";

const html = `<div class="shapeTools">
  <button data-act="rect" data-tip="Make it a rectangle" aria-label="Make it a rectangle"><svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="10" rx="1.5"/></svg></button>
  <button data-act="street" data-tip="Choose a street to line up with" aria-label="Choose a street to line up with"><svg viewBox="0 0 24 24"><path d="M8 3L5 21M16 3l3 18"/><path d="M12 5v2M12 11v2M12 17v2"/></svg></button>
  <button data-act="undo" data-tip="Undo" aria-label="Undo"><svg viewBox="0 0 24 24"><path d="M9 5L4 10l5 5"/><path d="M4 10h11a5 5 0 010 10h-4"/></svg></button>
  <button data-act="copy" data-tip="Copy to matching roofs" aria-label="Copy to matching roofs"><svg viewBox="0 0 24 24"><rect x="4" y="8" width="12" height="12" rx="1.5"/><path d="M8 8V4h12v12h-4"/></svg></button>
</div>`;

let tools = null, box = null;

function act(e) {
  const a = e.target.closest("[data-act]")?.dataset.act;
  if (a === "rect") squareShape();
  if (a === "street") pickStreet(lineUpShape);
  if (a === "undo" && !undoShape()) toast("Nothing to undo.");
  if (a === "copy") { const coords = box.coords; unfocus(); startCopying(coords, addBox); }
}

watchShape(b => {
  box = b;
  if (!b) { if (tools) tools.remove(); tools = null; return; }
  const at = b.shape.getBounds().getNorthEast(); // top-right of the building, so the tools never cover it
  if (tools) return tools.setLatLng(at);
  tools = L.marker(at, { icon: L.divIcon({ className: "", html, iconSize: [146, 44], iconAnchor: [-8, 52] }), zIndexOffset: 3000 }).addTo(map);
  const el = tools.getElement();
  L.DomEvent.disableClickPropagation(el); // a tap on a tool is not a tap on the map
  el.addEventListener("click", act);
});
