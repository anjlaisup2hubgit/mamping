import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SourceTextModule, SyntheticModule, createContext } from "node:vm";
import { bounded, checkCancelled } from "../src/data/tasks.js";

const LIB = "https://cdn.jsdelivr.net/npm/upscaler@1.0.0/+esm";
const MODEL = "https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/2x/+esm";
const WEIGHTS = "https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0/models/x2/model.json";
const TF = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/+esm";
const WASM = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.11.0/+esm";
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.11.0/dist/";
const plain = value => JSON.parse(JSON.stringify(value));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

async function setup(options = {}) {
  const imported = [], instances = [], calls = [], pictures = [], canvases = [], backendEvents = [];
  const context = createContext({
    setTimeout: options.setTimeout || setTimeout,
    clearTimeout: options.clearTimeout || clearTimeout,
    AbortSignal: { timeout: milliseconds => ({ milliseconds }) },
    Image: class {
      constructor() {
        const size = options.dimensions?.[pictures.length] || [1536, 1536];
        [this.naturalWidth, this.naturalHeight] = size;
        pictures.push(this);
      }
      decode() { return Promise.resolve(); }
    },
    document: {
      createElement: tag => {
        assert.equal(tag, "canvas");
        const draws = [];
        const g = { drawImage: (...args) => draws.push(args) };
        const canvas = {
          getContext: type => { assert.equal(type, "2d"); return g; },
          toDataURL: (...args) => {
            canvas.encoding = args;
            return "data:image/jpeg;base64,resized-jpeg";
          },
          draws, g
        };
        canvases.push(canvas);
        return canvas;
      }
    }
  });
  class Upscaler {
    constructor(configuration) {
      backendEvents.push(["construct"]);
      this.configuration = configuration;
      instances.push(this);
      this.ready = options.ready?.(instances.length) || Promise.resolve();
    }
    async upscale(image, settings) {
      calls.push({ image, settings });
      return options.upscale ? options.upscale(image, settings, calls.length) : "data:image/png;base64,enhanced";
    }
    dispose() { this.disposed = true; }
  }
  const exports = {
    [LIB]: { default: Upscaler },
    [MODEL]: { default: { scale: 2, modelType: "layers" } },
    [TF]: {
      setBackend: async name => { backendEvents.push(["setBackend", name]); return true; },
      ready: async () => { backendEvents.push(["ready"]); await options.tfReady?.(); }
    },
    [WASM]: { setWasmPaths: path => backendEvents.push(["setWasmPaths", path]) }
  };
  const code = await readFile(new URL("../src/data/enhanceImage.js", import.meta.url), "utf8");
  const module = new SourceTextModule(code, {
    context,
    importModuleDynamically: async specifier => {
      imported.push(specifier);
      await options.import?.(specifier, imported.filter(item => item === specifier).length);
      assert.ok(specifier in exports, `Unexpected enhancement dependency: ${specifier}`);
      const dependency = new SyntheticModule(Object.keys(exports[specifier]), function () {
        for (const [name, value] of Object.entries(exports[specifier])) this.setExport(name, value);
      }, { context });
      await dependency.link(() => assert.fail("Unexpected nested model import"));
      await dependency.evaluate();
      return dependency;
    }
  });
  await module.link(specifier => {
    assert.equal(specifier, "./tasks.js");
    return new SyntheticModule(["bounded", "checkCancelled"], function () {
      this.setExport("bounded", bounded); this.setExport("checkCancelled", checkCancelled);
    }, { context });
  });
  await module.evaluate();
  return { enhanceImage: module.namespace.enhanceImage, imported, instances, calls, pictures, canvases, backendEvents };
}

test("waits for the pinned model to be ready and restores the satellite pixel dimensions", async () => {
  const ready = deferred();
  const state = await setup({ ready: () => ready.promise });
  const result = state.enhanceImage("satellite-jpeg");
  await new Promise(done => setImmediate(done));
  assert.equal(state.instances.length, 1);
  assert.equal(state.calls.length, 0, "Inference must wait for model weights");
  ready.resolve();
  assert.equal(await result, "resized-jpeg");
  assert.deepEqual(state.imported.sort(), [LIB, MODEL, TF, WASM].sort());
  assert.deepEqual(state.backendEvents, [["setWasmPaths", WASM_PATH], ["setBackend", "wasm"], ["ready"], ["construct"]]);
  assert.deepEqual(plain(state.instances[0].configuration), {
    model: { scale: 2, modelType: "layers", path: WEIGHTS }
  });
  assert.equal(state.calls[0].image, "data:image/jpeg;base64,satellite-jpeg");
  assert.deepEqual(plain(state.calls[0].settings), {
    patchSize: 64, padding: 8, awaitNextFrame: true, signal: { milliseconds: 60000 }
  });
  const canvas = state.canvases[0];
  assert.equal(canvas.width, 768);
  assert.equal(canvas.height, 768);
  assert.equal(canvas.g.imageSmoothingQuality, "high");
  assert.deepEqual(canvas.draws, [[state.pictures[0], 0, 0, 768, 768]]);
  assert.deepEqual(canvas.encoding, ["image/jpeg", 0.9]);
});

test("serializes concurrent pictures and reuses the loaded model", async () => {
  const started = deferred(), release = deferred();
  const state = await setup({
    upscale: async (image, settings, count) => {
      if (count === 1) { started.resolve(); await release.promise; }
      return "data:image/png;base64,enhanced";
    }
  });
  const first = state.enhanceImage("first");
  const second = state.enhanceImage("second");
  await started.promise;
  assert.equal(state.calls.length, 1, "The second inference must remain queued");
  release.resolve();
  assert.deepEqual(await Promise.all([first, second]), ["resized-jpeg", "resized-jpeg"]);
  assert.deepEqual(state.calls.map(call => call.image), ["data:image/jpeg;base64,first", "data:image/jpeg;base64,second"]);
  assert.equal(state.instances.length, 1);
  assert.equal(state.imported.length, 4);
});

test("waits for the WASM backend before constructing the image model", async () => {
  const ready = deferred();
  const state = await setup({ tfReady: () => ready.promise });
  const result = state.enhanceImage("satellite-jpeg");
  await new Promise(done => setImmediate(done));
  assert.equal(state.instances.length, 0, "Model construction must await backend initialization");
  assert.equal(state.calls.length, 0);
  assert.deepEqual(state.backendEvents, [["setWasmPaths", WASM_PATH], ["setBackend", "wasm"], ["ready"]]);
  ready.resolve();
  assert.equal(await result, "resized-jpeg");
  assert.equal(state.instances.length, 1);
});

test("a failed inference rejects its picture without poisoning the queue", async () => {
  const failure = new Error("Inference timed out");
  const state = await setup({ upscale: async (image, settings, count) => {
    if (count === 1) throw failure;
    return "data:image/png;base64,enhanced";
  } });
  const first = state.enhanceImage("first");
  const second = state.enhanceImage("second");
  await assert.rejects(first, error => error === failure);
  assert.equal(await second, "resized-jpeg");
  assert.equal(state.instances.length, 1);
  assert.equal(state.calls.length, 2);
});

test("a failed model import can load again on the next picture", async () => {
  const failure = new Error("CDN unavailable");
  const state = await setup({ import: (specifier, count) => {
    if (specifier === MODEL && count === 1) throw failure;
  } });
  await assert.rejects(state.enhanceImage("first"), error => error === failure);
  assert.equal(await state.enhanceImage("second"), "resized-jpeg");
  assert.equal(state.instances.length, 1);
  assert.equal(state.imported.filter(item => item === MODEL).length, 2);
});

test("failed weight loading can retry with a fresh model", async () => {
  const failure = new Error("Weights unavailable");
  const state = await setup({ ready: count => count === 1 ? Promise.reject(failure) : Promise.resolve() });
  await assert.rejects(state.enhanceImage("first"), error => error === failure);
  assert.equal(await state.enhanceImage("second"), "resized-jpeg");
  assert.equal(state.instances.length, 2);
  assert.equal(state.calls.length, 1);
});

test("a model download timeout releases the queue and disposes a late model", async () => {
  const ready = deferred(), timers = [];
  const state = await setup({
    ready: count => count === 1 ? ready.promise : Promise.resolve(),
    setTimeout: (callback, milliseconds) => {
      const timer = { callback, milliseconds, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout: timer => { timer.cleared = true; }
  });
  const first = state.enhanceImage("slow-download");
  await new Promise(done => setImmediate(done));
  assert.equal(state.instances.length, 1);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].milliseconds, 30000);
  timers[0].callback();
  await assert.rejects(first, /Picture model download timed out/);
  assert.equal(timers[0].cleared, true);
  assert.equal(state.instances[0].disposed, undefined, "Pending model must finish loading before disposal");
  assert.equal(await state.enhanceImage("retry-download"), "resized-jpeg");
  assert.equal(state.instances.length, 2);
  assert.equal(timers.length, 2);
  assert.equal(timers[1].cleared, true, "Successful loads must clear their deadline");
  ready.resolve();
  await new Promise(done => setImmediate(done));
  assert.equal(state.instances[0].disposed, true);
  assert.equal(state.instances[1].disposed, undefined, "Late cleanup must not dispose the replacement model");
  assert.equal(state.calls.length, 1, "The timed-out picture must never run inference");
});

for (const dimensions of [[768, 1536], [1536, 768]]) {
  test(`rejects ${dimensions.join("x")} output instead of shifting map coordinates`, async () => {
    const state = await setup({ dimensions: [dimensions, [1536, 1536]] });
    await assert.rejects(state.enhanceImage("wrong-size"), /Unexpected enhanced picture size/);
    assert.equal(state.canvases.length, 0);
    assert.equal(await state.enhanceImage("correct-size"), "resized-jpeg");
  });
}
