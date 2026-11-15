// "Fixing outlines": the two design pictures that show how to fix a building shape fast.
import { header, bindBack } from "../components/header.js";

const PICTURES = [
  ["Triangles", "/docs/design-notes/triangle-to-rectangle.svg"],
  ["Shortcuts and gestures", "/docs/design-notes/fix-gestures.svg"]
];

export const fixGuide = {
  open(el) {
    el.innerHTML = header("Fixing outlines") + `<div class="pad scroll">${PICTURES.map(([t, src]) =>
      `<h3 class="sec">${t}</h3><img src="${src}" alt="${t}" style="width:100%;border-radius:12px;margin-bottom:14px">`).join("")}</div>`;
    bindBack(el, "settings");
  }
};
