/* Photo / video for the user's own exercises: stored ONLY on this device (IndexedDB).
   Never uploaded, never synced, never shared with a coach. */
import { useEffect, useState } from "react";
import { compressImageToBlob } from "./imageCompress";

const DB = "gymak_exmedia_v1", STORE = "media";
export const MAX_VIDEO_MB = 30;
export const MAX_IMAGE_MB = 20;

export function createIdbAdapter(idb = typeof indexedDB !== "undefined" ? indexedDB : null) {
  if (!idb) return null;
  const open = () => new Promise((res, rej) => {
    const r = idb.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const run = async (mode, fn) => {
    const db = await open();
    try {
      return await new Promise((res, rej) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => res(req && "result" in req ? req.result : undefined);
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error);
      });
    } finally { db.close(); }
  };
  return {
    get: (id) => run("readonly", (s) => s.get(id)),
    put: (rec) => run("readwrite", (s) => s.put(rec)),
    del: (id) => run("readwrite", (s) => s.delete(id)),
  };
}

export function createMemoryAdapter() {
  const m = new Map();
  return { get: async (id) => m.get(id), put: async (r) => { m.set(r.id, r); }, del: async (id) => { m.delete(id); } };
}

let adapter = null;
export function setAdapter(a) { adapter = a; }
function ad() { if (!adapter) adapter = createIdbAdapter() || createMemoryAdapter(); return adapter; }

/** "image" | "video" | null for a picked file (null = unsupported or too large). */
export function mediaKindOf(file) {
  if (!file || !file.type) return null;
  if (file.type.startsWith("image/")) return file.size <= MAX_IMAGE_MB * 1048576 ? "image" : null;
  if (file.type.startsWith("video/")) return file.size <= MAX_VIDEO_MB * 1048576 ? "video" : null;
  return null;
}

/** Prepares (compresses images) and stores the media for an exercise id. Resolves the kind. */
export async function saveExerciseMedia(exerciseId, file) {
  const kind = mediaKindOf(file);
  if (!exerciseId || !kind) throw new Error("unsupported-media");
  let blob = file;
  if (kind === "image" && file.type !== "image/gif") {
    try { blob = await compressImageToBlob(file, 1280, 0.82); } catch { blob = file; }
  }
  if (!blob || !blob.size) throw new Error("empty-media");
  await ad().put({ id: exerciseId, kind, blob, createdAt: Date.now() });
  return kind;
}

export async function getExerciseMedia(exerciseId) {
  const r = await ad().get(exerciseId);
  return r && r.blob ? r : null;
}

export async function deleteExerciseMedia(exerciseId) {
  try { await ad().del(exerciseId); } catch { /* nothing stored */ }
}

/** React hook: object URL for an exercise's local media (revoked on cleanup). */
export function useExerciseMedia(exerciseId, enabled) {
  const [state, setState] = useState({ url: null, kind: null });
  useEffect(() => {
    if (!enabled || !exerciseId) { setState({ url: null, kind: null }); return undefined; }
    let alive = true, objUrl = null;
    getExerciseMedia(exerciseId).then((r) => {
      if (!alive || !r) return;
      objUrl = URL.createObjectURL(r.blob);
      setState({ url: objUrl, kind: r.kind });
    }).catch(() => {});
    return () => { alive = false; if (objUrl) URL.revokeObjectURL(objUrl); };
  }, [exerciseId, enabled]);
  return state;
}
