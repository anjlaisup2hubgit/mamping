// One row in a list of the user's videos. A video the AI has not read yet gets a button to read it now.
import { esc } from "./dom.js";

const status = c => (c.blob ? "Not checked by AI yet" : c.sent ? "Shared" : "Private, video deleted");

export const videoRow = c => `<div class="item"><b>${esc(c.name || "Unmatched video")}</b><br><span class="mid">${c.secs}s · ${esc(c.at)}</span><br><span class="tag">${status(c)}</span>
  ${c.blob ? `<br><button class="ghost show" data-check="${c.id}" style="margin-top:8px">Check with AI</button>` : ""}</div>`;
