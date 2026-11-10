// A short message that fades away.
export function toast(text) {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}
