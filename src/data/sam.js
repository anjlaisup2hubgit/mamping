// Traces one roof with the free SlimSAM model, running inside the user's browser (no key, no server).
import { maskPolygon } from "./maskPolygon.js";
import { bounded, checkCancelled } from "./tasks.js";

const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";
const MODEL = "Xenova/slimsam-77-uniform";
const ROOF_AREA = [200, 12000]; // pixels in the 768 by 768 picture
let loading = null;
const seen = new Map(); // picture -> its "image embeddings", worked out once and reused for every roof in it
const disposed = new WeakSet();
const dispose = value => {
  if (!value || typeof value !== "object" || disposed.has(value)) return;
  disposed.add(value);
  if (typeof value.dispose === "function") { try { Promise.resolve(value.dispose()).catch(() => {}); } catch {} return; }
  Object.values(value).forEach(dispose);
};
function release(image) {
  const entry = seen.get(image);
  if (entry) { seen.delete(image); dispose(entry); }
}

const load = () => loading ||= (async () => {
  const T = await import(LIB);
  const [model, processor] = await Promise.all([T.SamModel.from_pretrained(MODEL), T.AutoProcessor.from_pretrained(MODEL)]);
  return { T, model, processor };
})().catch(e => { loading = null; throw e; });

async function study(sam, image) {
  if (!seen.has(image)) {
    const raw = await sam.T.RawImage.read("data:image/jpeg;base64," + image);
    const inputs = await sam.processor(raw);
    seen.set(image, { inputs, embeddings: await sam.model.get_image_embeddings(inputs) });
    while (seen.size > 2) release(seen.keys().next().value);
  }
  return seen.get(image);
}

// image: the picture's base64 jpeg. point: [x, y] pixel on the roof. Returns pixel corners or null.
async function trace(image, point, signal) {
  checkCancelled(signal);
  const sam = await bounded(load(), { signal, timeout: 60000, label: "Roof tracing model download" });
  const { inputs, embeddings } = await study(sam, image);
  checkCancelled(signal);
  const [rh, rw] = inputs.reshaped_input_sizes[0], [oh, ow] = inputs.original_sizes[0];
  const points = new sam.T.Tensor("float32", [point[0] / ow * rw, point[1] / oh * rh], [1, 1, 1, 2]);
  const labels = new sam.T.Tensor("int64", [1n], [1, 1, 1]);
  let out, masks;
  try {
    out = await sam.model({
    ...embeddings,
    input_points: points, input_labels: labels
    });
  masks = (await sam.processor.post_process_masks(out.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes))[0];
  const scores = Array.from(out.iou_scores.data);
  const size = oh * ow, pick = [];
  scores.forEach((score, i) => { // the model offers 3 masks (small to whole scene): skip ones too big or tiny to be one roof
    const m = masks.data.slice(i * size, (i + 1) * size);
    const area = m.reduce((a, v) => a + (v ? 1 : 0), 0);
    if (area >= ROOF_AREA[0] && area <= ROOF_AREA[1]) pick.push({ score, m });
  });
  pick.sort((a, b) => b.score - a.score);
  return pick.length ? maskPolygon(pick[0].m, ow, oh, point) : null;
  } finally { dispose(out); dispose(masks); dispose(points); dispose(labels); }
}

// Several pictures are scanned at once, but the model handles one roof at a time, so line them up.
let line = Promise.resolve();
export const releaseSamImage = image => line.then(() => release(image), () => release(image));
export const samTrace = (image, point, { signal } = {}) => {
  const next = line.then(() => trace(image, point, signal), () => trace(image, point, signal));
  line = next.catch(() => {});
  return bounded(next, { signal, timeout: 90000, label: "Roof tracing" });
};
