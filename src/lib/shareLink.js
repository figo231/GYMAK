export const APP_URL = "https://gymak-eight.vercel.app";
export function programLink(id) { return `${APP_URL}/programs?p=${encodeURIComponent(id)}`; }
export function programIdFromSearch(search, validIds) {
  try { const id = new URLSearchParams(search).get("p"); return id && validIds.includes(id) ? id : null; } catch { return null; }
}
export async function shareText({ title, text, url }) {
  if (navigator.share) { try { await navigator.share({ title, text, url }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancelled"; } }
  try { await navigator.clipboard.writeText(url); return "copied"; } catch { return "failed"; }
}
