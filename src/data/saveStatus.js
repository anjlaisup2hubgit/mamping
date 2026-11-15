// Shared saving status for the draft inspector and pending-edits list.
let status = { state: "saved", message: "Saved on this device" };
const listeners = new Set();

export const getSaveStatus = () => ({ ...status });
export function setSaveStatus(state, message) {
  if (status.state === state && status.message === message) return;
  status = { state, message };
  listeners.forEach(f => f(getSaveStatus()));
}
export function watchSaveStatus(f) {
  listeners.add(f);
  f(getSaveStatus());
  return () => listeners.delete(f);
}
