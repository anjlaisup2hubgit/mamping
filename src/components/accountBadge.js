// Small round account picture in the top corner of the map, shown only when logged in. Tap it for Settings.
import { isLoggedIn, accountName } from "../data/osmAuth.js";
import { go } from "./router.js";

export const accountBadge = () => (isLoggedIn() ? `<button class="account" id="account" aria-label="Your account" data-tip="Logged in">?</button>` : "");

export async function bindAccountBadge(el) {
  const b = el.querySelector("#account");
  if (!b) return;
  b.onclick = () => go("settings");
  const name = await accountName();
  if (name) { b.textContent = name[0].toUpperCase(); b.dataset.tip = "Logged in as " + name; b.setAttribute("aria-label", b.dataset.tip); }
}
