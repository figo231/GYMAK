// Favourite exercises, kept on this device only.
const KEY = "gymak_fav_exercises_v1";
export function getFavs() {
  try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return new Set(Array.isArray(a) ? a : []); } catch { return new Set(); }
}
export function toggleFav(id) {
  const s = getFavs();
  if (s.has(id)) s.delete(id); else s.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* storage full or blocked */ }
  return s;
}
