// Clarifies a satellite picture on this device with UpscalerJS's small, free ESRGAN Slim 2x model.
import { bounded, checkCancelled } from "./tasks.js";
const LIB = "https://cdn.jsdelivr.net/npm/upscaler@1.0.0/+esm";
const MODEL = "https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/2x/+esm";
const WEIGHTS = "https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/models/x2/model.json";
const TF = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/+esm";
const WASM = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.11.0/+esm";
const SIZE = 768; // keep the same pixel-to-map positions as the original satellite picture
let loading = null;

const load = () => loading ||= (async () => {
  const ready = (async () => {
    const [{ default: Upscaler }, { default: model }, tf, wasm] = await Promise.all([import(LIB), import(MODEL), import(TF), import(WASM)]);
    // A small WebAssembly runtime works without a graphics card, including on phones.
    wasm.setWasmPaths("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.11.0/dist/");
    await tf.setBackend("wasm");
    await tf.ready();
    const upscaler = new Upscaler({ model: { ...model, path: WEIGHTS } });
    await upscaler.ready;
    return upscaler;
  })();
  let timer;
  try {
    return await Promise.race([ready, new Promise((_, no) => {
      timer = setTimeout(() => no(new Error("Picture model download timed out.")), 30000);
    })]);
  } catch (e) {
    ready.then(upscaler => upscaler.dispose()).catch(() => {}); // release a model that finishes after a timeout
    throw e;
  } finally { clearTimeout(timer); }
})().catch(e => { loading = null; throw e; });

async function clarify(image, signal) {
  checkCancelled(signal);
  const upscaler = await load();
  checkCancelled(signal);
  const deadline = AbortSignal.timeout(60000);
  const result = await upscaler.upscale("data:image/jpeg;base64," + image, {
    patchSize: 64, padding: 8, awaitNextFrame: true, signal: signal ? AbortSignal.any([signal, deadline]) : deadline
  });
  const picture = new Image();
  picture.src = result;
  await picture.decode();
  if (picture.naturalWidth !== SIZE * 2 || picture.naturalHeight !== SIZE * 2) throw new Error("Unexpected enhanced picture size.");
  // Detection and tracing both expect 768 pixels, not the model's doubled size.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(picture, 0, 0, SIZE, SIZE);
  return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
}

// Keep the phone responsive and avoid running several copies of the model at once.
let line = Promise.resolve();
export const enhanceImage = (image, { signal } = {}) => {
  const next = line.then(() => clarify(image, signal));
  line = next.catch(() => {}); // a failed picture must not block the next one
  return signal ? bounded(next, { signal, timeout: 95000, label: "Picture clarification" }) : next;
};
