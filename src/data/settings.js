// Saves the AI choices on this phone.
const KEY = "display_settings";
// outline = how each missing building is drawn; geminiKey is the user's own key.
const DEFAULTS = { outline: "rect", geminiKey: "" };

export const getSettings = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) { return { ...DEFAULTS }; }
};

export function saveSetting(name, value) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...getSettings(), [name]: value })); } catch (e) { /* cannot save */ }
}
