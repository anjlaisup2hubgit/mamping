// Reads colours from the original satellite photo around a building (never the sharpened one, whose details may be made up).
import { getSatelliteView } from "./satellite.js";

// Returns colourAt(lat, lng) = [r, g, b], blended from the 4 nearest pixels so it changes smoothly between them.
export async function roofPhoto([lat, lng]) {
  const view = await getSatelliteView(lat, lng);
  const { width: w, height: h } = view.canvas;
  const px = view.canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const pixel = (x, y, c) => px[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4 + c];
  return (la, ln) => {
    const [x, y] = view.toPixel(la, ln).map(v => v - 0.5); // pixel centres sit half a pixel in
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    return [0, 1, 2].map(c => (pixel(x0, y0, c) * (1 - fx) + pixel(x0 + 1, y0, c) * fx) * (1 - fy) + (pixel(x0, y0 + 1, c) * (1 - fx) + pixel(x0 + 1, y0 + 1, c) * fx) * fy);
  };
}
