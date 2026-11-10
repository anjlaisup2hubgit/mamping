// Switches between pages. A page is {full, open(el, arg), close()}.
import { $ } from "./dom.js";

const pages = {};
let current = null;

export const register = list => Object.assign(pages, list);

export function go(name, arg) {
  if (current && current.close) current.close();
  current = pages[name];
  const el = $("#page");
  el.innerHTML = "";
  el.className = current.full === false ? "" : "full";
  current.open(el, arg);
}
