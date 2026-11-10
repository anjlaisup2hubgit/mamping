// One row in a list of the user's videos.
import { esc } from "./dom.js";

export const videoRow = c => `<div class="item"><b>${esc(c.name || "Unmatched video")}</b><br><span class="mid">${c.secs}s · ${esc(c.at)}</span><br><span class="tag">${c.sent ? "Shared" : "Private, on this phone"}</span></div>`;
