// Saving and loading videos on this phone (IndexedDB).
let db = null;

export function openStore() {
  return new Promise((ok, no) => {
    const r = indexedDB.open("hometown", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("clips", { keyPath: "id" });
    r.onsuccess = () => { db = r.result; ok(); };
    r.onerror = () => no(r.error);
  });
}
const table = mode => db.transaction("clips", mode).objectStore("clips");

export const saveClip = clip => new Promise((ok, no) => {
  const q = table("readwrite").put(clip);
  q.onsuccess = ok; q.onerror = () => no(q.error);
});
export const allClips = () => new Promise((ok, no) => {
  const q = table("readonly").getAll();
  q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error);
});
