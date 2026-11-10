// Saves and applies display choices (colour theme and text size) on this phone.
const KEY = "display_settings";
const SIZES = { small: "14px", normal: "16px", large: "19px" };

export const getSettings = () => {
  try { return { theme: "auto", size: "normal", ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) { return { theme: "auto", size: "normal" }; }
};

export function applySettings() {
  const { theme, size } = getSettings(), root = document.documentElement;
  if (theme === "auto") root.removeAttribute("data-theme"); else root.dataset.theme = theme;
  root.style.setProperty("--fs", SIZES[size] || SIZES.normal);
}

export function saveSetting(name, value) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...getSettings(), [name]: value })); } catch (e) { /* cannot save */ }
  applySettings();
}
