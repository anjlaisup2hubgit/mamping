// Saved work and explicit retry controls. No failed edit is silently discarded or resent.
import { esc } from "./dom.js";
import { toast } from "./toast.js";
import { isLoggedIn } from "../data/osmAuth.js";
import { getQueue, getUnassignedQueue, retryQueued, confirmQueuedSent, adoptUnassignedQueue } from "../data/osmSend.js";
import { unassignedDraftCount, importUnassignedDrafts, retryScanSync } from "../data/savedScan.js";
import { getSaveStatus, watchSaveStatus } from "../data/saveStatus.js";

function content() {
  const list = getQueue(), unassigned = getUnassignedQueue().length, drafts = unassignedDraftCount(), status = getSaveStatus();
  return `<h3 style="margin:0">Saved work</h3><p role="status" class="mid" style="margin:6px 0">${esc(status.message)}</p>
    ${status.state === "pending" && isLoggedIn() ? '<button class="ghost pill" data-sync>Retry account sync</button>' : ""}
    <p style="margin:10px 0 6px">${list.length ? `${list.length} pending edit${list.length === 1 ? "" : "s"}` : "No pending map edits"}</p>
    ${list.map((j, i) => {
      const q = j.queue || {}, held = ["sending", "uncertain", "sent"].includes(q.state);
      const title = j.kind === "tags" ? "Building details" : `${j.items?.length || 0} building outline(s)`;
      return `<div class="note" style="margin-top:8px"><b>${esc(title)}</b><p class="mid" style="margin:4px 0">${esc(q.error || (held ? "Sending was interrupted. Check the map before retrying." : q.state === "failed" ? "Sending failed; the edit is still saved." : "Saved and waiting to send."))}</p>
        ${isLoggedIn() && q.id ? `<div class="row"><button class="ghost pill" data-retry="${i}">${held ? "Checked map: retry" : "Retry"}</button>${held ? `<button class="ghost pill" data-sent="${i}">Already on map</button>` : ""}</div>` : '<p class="mid">Log in to assign and send these saved edits.</p>'}</div>`;
    }).join("")}
    ${unassigned ? `<p class="mid">${unassigned} older edit(s) have no account assigned. They will never send automatically.</p>${isLoggedIn() ? '<button class="ghost pill" data-adopt>Assign older edits to this account</button>' : ""}` : ""}
    ${drafts ? `<p class="mid">${drafts} unassigned outline draft(s) are also saved on this device.</p>${isLoggedIn() ? '<button class="ghost pill" data-drafts>Import these outline drafts</button>' : ""}` : ""}`;
}

export const pendingEdits = () => `<section class="card" id="pendingEdits" style="margin-top:16px">${content()}</section>`;

export function bindPendingEdits(root) {
  const box = root.querySelector("#pendingEdits");
  if (!box) return () => {};
  const run = async (button, work) => {
    button.disabled = true;
    try { await work(); }
    catch (e) { toast(e.message); }
    finally { draw(); }
  };
  const draw = () => {
    box.innerHTML = content();
    const list = getQueue();
    box.querySelectorAll("[data-retry]").forEach(b => { b.onclick = () => {
      const job = list[+b.dataset.retry];
      if (!job) return;
      if (["sending", "uncertain"].includes(job.queue.state) && !confirm("Check OpenStreetMap first. Are you sure this edit was NOT already applied? Retrying an applied edit can add it twice.")) return;
      run(b, async () => { const result = await retryQueued(job.queue.id); if (result.failed) toast("The edit is still saved. Check its error below."); });
    }; });
    box.querySelectorAll("[data-sent]").forEach(b => { b.onclick = () => {
      if (!confirm("Have you checked that this edit is already on OpenStreetMap? This removes only its pending-send reminder.")) return;
      run(b, () => confirmQueuedSent(list[+b.dataset.sent].queue.id));
    }; });
    const adopt = box.querySelector("[data-adopt]");
    if (adopt) adopt.onclick = () => { if (confirm("Assign these older saved edits to your current OpenStreetMap account? Review each before retrying.")) run(adopt, adoptUnassignedQueue); };
    const drafts = box.querySelector("[data-drafts]");
    if (drafts) drafts.onclick = () => { if (confirm("Import unassigned outlines into your current account's drafts?")) run(drafts, async () => { await importUnassignedDrafts(); location.reload(); }); };
    const sync = box.querySelector("[data-sync]");
    if (sync) sync.onclick = () => run(sync, retryScanSync);
  };
  const stop = watchSaveStatus(draw);
  addEventListener("pending-edits", draw);
  return () => { stop(); removeEventListener("pending-edits", draw); };
}
