// Keep each running job's picture selection fixed and deliver finished pictures without waiting for the batch.
import { scanImage } from "./scanImage.js";
import { bounded, checkCancelled } from "./tasks.js";

export async function runScanJob(pictures, { signal, clarify = false, onResult, onProgress, scanPicture = scanImage } = {}) {
  const selected = pictures.map(p => ({ centre: [...p.centre], nw: [...p.nw], se: [...p.se] }));
  const failed = [], errors = [], finished = new Set();
  let cursor = 0, completed = 0, fallback = 0;
  async function worker() {
    while (cursor < selected.length && !signal?.aborted) {
      const index = cursor++, picture = selected[index];
      try {
        const result = await bounded(scanPicture(...picture.centre, clarify, {
          signal,
          onStage: stage => onProgress?.({ index: index + 1, completed, total: selected.length, stage })
        }), { signal, timeout: 240000, label: `Picture ${index + 1}` });
        checkCancelled(signal);
        if (result.fallback) fallback++;
        await onResult?.(result.buildings, picture);
      } catch (e) {
        if (signal?.aborted) break;
        failed.push(picture); errors.push(e);
      }
      finished.add(index); completed++;
      onProgress?.({ index: index + 1, completed, total: selected.length, stage: "Picture finished" });
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, selected.length) }, worker));
  return { failed, errors, unfinished: selected.filter((_, i) => !finished.has(i)), completed, total: selected.length, fallback, cancelled: !!signal?.aborted };
}
