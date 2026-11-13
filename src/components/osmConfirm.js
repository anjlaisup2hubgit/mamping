// "I checked this" box and the login check that guard every edit to OpenStreetMap.
import { $ } from "./dom.js";
import { isLoggedIn } from "../data/osmAuth.js";
import { toast } from "./toast.js";

export const osmConfirm = () => `<label style="display:flex;gap:10px;align-items:flex-start;color:var(--ink);font-size:14px;margin:0"><input type="checkbox" id="osmOk" style="margin-top:3px"><span>I checked this against what I saw. Send it to OpenStreetMap.</span></label>`;

export function osmAllowed() {
  if (!isLoggedIn()) { toast("Connect OpenStreetMap in Settings first."); return false; }
  if (!$("#osmOk").checked) { toast("Tick the box to confirm you checked it."); return false; }
  return true;
}
