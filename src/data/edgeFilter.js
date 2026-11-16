// Makes edges in a picture crisper ("unsharp mask"): each pixel moves further away from a blurred copy of itself.
const AMOUNT = 1.2, BLUR = 1.2; // tested on Hai Phong roofs: stronger starts to show halos

// picture = a loaded <img>; returns a JPEG data URL the same size.
export function crispEdges(picture) {
  const canvas = document.createElement("canvas");
  const w = canvas.width = picture.naturalWidth, h = canvas.height = picture.naturalHeight;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  g.drawImage(picture, 0, 0);
  const sharp = g.getImageData(0, 0, w, h);
  g.filter = `blur(${BLUR}px)`;
  g.drawImage(picture, 0, 0);
  const blurred = g.getImageData(0, 0, w, h).data;
  for (let i = 0; i < blurred.length; i++) if (i % 4 !== 3) sharp.data[i] += AMOUNT * (sharp.data[i] - blurred[i]); // the 4th value is see-through-ness, left alone
  g.filter = "none";
  g.putImageData(sharp, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}
