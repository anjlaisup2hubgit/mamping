// Switches between pages. A page is {full, open(el, arg), close()}, or a function that loads one.
import { $ } from "./dom.js";

const pages = {};
let current = null;

export const register = list => Object.assign(pages, list);

export async function go(name, arg) {
  if (typeof pages[name] === "function") pages[name] = await pages[name](); // load the page the first time
  if (current && current.close) current.close();
  current = pages[name];
  const el = $("#page");
  el.innerHTML = "";
  el.className = current.full === false ? "" : "full";
  current.open(el, arg);
}
