// A short message that fades away.
export function toast(text) {
  document.querySelectorAll(".toast").forEach(t => t.remove()); // one message at a time, never stacked
  const d = document.createElement("div");
  d.className = "toast";
  d.setAttribute("role", "status");
  d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}
