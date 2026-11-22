/* Progress photos: stored ONLY on this device (IndexedDB). Never uploaded, never synced, never shared with a coach. */
const DB = "gymak_photos_v1", STORE = "photos";
export const POSES = [["front", "من الأمام"], ["side", "من الجنب"], ["back", "من الضهر"]];
export const MAX_PHOTOS = 200;

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
    all: () => run("readonly", (s) => s.getAll()),
    put: (rec) => run("readwrite", (s) => s.put(rec)),
    del: (id) => run("readwrite", (s) => s.delete(id)),
  };
}

export function createMemoryAdapter() {
  const m = new Map();
  return { all: async () => [...m.values()], put: async (r) => { m.set(r.id, r); }, del: async (id) => { m.delete(id); } };
}

let adapter = null;
export function setAdapter(a) { adapter = a; }
function ad() { if (!adapter) adapter = createIdbAdapter() || createMemoryAdapter(); return adapter; }

export function newId() { return `ph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Newest first. */
export async function listPhotos() {
  const rows = await ad().all();
  return rows.filter((r) => r && r.id && r.blob).sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

export async function addPhoto(blob, { date = todayKey(), pose = "front" } = {}) {
  if (!blob || !blob.size) throw new Error("empty-photo");
  if (!POSES.some(([k]) => k === pose)) pose = "front";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayKey();
  const existing = await ad().all();
  if (existing.length >= MAX_PHOTOS) throw new Error("photo-limit");
  const rec = { id: newId(), date, pose, blob, createdAt: Date.now() };
  await ad().put(rec);
  return rec;
}

export async function deletePhoto(id) { await ad().del(id); }

/** Oldest and newest photo of the same pose (falls back to any pose). Null with fewer than 2 photos. */
export function compareSet(photos, pose = null) {
  const pool = pose ? photos.filter((p) => p.pose === pose) : photos;
  if (pool.length < 2) return null;
  return { before: pool[pool.length - 1], after: pool[0] };
}
