// Account card at the top of Settings: who is logged in to OpenStreetMap, with Log in or Log out.
import { $ } from "./dom.js";
import { clearLocalScan } from "../data/savedScan.js";
import { isLoggedIn, login, logout, osmReady, accountName } from "../data/osmAuth.js";

export function osmAccount() {
  if (!osmReady()) return `<div class="card acct"><p class="mid" style="margin:0">OpenStreetMap editing is not set up yet.</p></div>`;
  const inside = isLoggedIn()
    ? `<span class="avatar" id="osmAv">?</span><span class="who"><b id="osmName">Logged in</b><span class="mid">OpenStreetMap account</span></span><button class="pill ghost" id="osmOut">Log out</button>`
    : `<span class="avatar off">?</span><span class="who"><b>Not logged in</b><span class="mid">Log in to send your edits to the map</span></span><button class="pill primary" id="osmIn">Log in</button>`;
  return `<div class="card acct"><div class="acctRow">${inside}</div></div>`;
}

export async function bindOsmAccount() {
  const inBtn = $("#osmIn"), outBtn = $("#osmOut");
  if (inBtn) inBtn.onclick = login;
  if (outBtn) outBtn.onclick = () => { logout(); clearLocalScan(); location.reload(); }; // reload so the last user's boxes leave the map
  if (!isLoggedIn()) return;
  const name = await accountName();
  if (name && $("#osmName")) { $("#osmName").textContent = name; $("#osmAv").textContent = name[0].toUpperCase(); }
}
