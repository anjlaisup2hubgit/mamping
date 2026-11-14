// Finds roofs in a satellite picture with the free Grounding DINO model, running inside the user's browser (no key, no server).
const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";
const MODEL = "onnx-community/grounding-dino-tiny-ONNX";
const MAX_SHARE = 0.4; // a box covering more than this share of the picture is not one roof
let loading = null;

const load = () => loading ||= (async () => {
  const T = await import(LIB);
  return T.pipeline("zero-shot-object-detection", MODEL);
})().catch(e => { loading = null; throw e; });

const area = b => (b.xmax - b.xmin) * (b.ymax - b.ymin);
const overlap = (a, b) => Math.max(0, Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin)) * Math.max(0, Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin));

// Keeps the most sure box when several sit on the same roof (one mostly inside another counts as the same roof).
function dropOverlaps(list) {
  const kept = [];
  for (const f of [...list].sort((a, b) => b.score - a.score)) {
    if (!kept.some(k => overlap(k.box, f.box) > 0.5 * Math.min(area(k.box), area(f.box)))) kept.push(f);
  }
  return kept;
}

// image: the picture's base64 jpeg. Returns [{ points, confidence }] with corners in picture pixels.
async function detect(image) {
  const detector = await load();
  const found = await detector("data:image/jpeg;base64," + image, ["a roof."], { threshold: 0.17 }); // low on purpose: 0.3 missed most houses
  const size = 768 * 768; // same picture size the roof tracer expects
  return dropOverlaps(found.filter(f => area(f.box) < size * MAX_SHARE))
    .map(({ box: b, score }) => ({ points: [[b.xmin, b.ymin], [b.xmax, b.ymin], [b.xmax, b.ymax], [b.xmin, b.ymax]], confidence: score }));
}

// One picture at a time, like the roof tracer, so the phone is not overloaded.
let line = Promise.resolve();
export const dinoFind = image => (line = line.then(() => detect(image), () => detect(image)));
