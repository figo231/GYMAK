/**
 * Deterministic, content-addressed pseudo-UUID (cyrb128-style 64-bit hash,
 * doubled to fill a UUID's 128 bits). NOT cryptographically secure — it
 * doesn't need to be. Its only job is: the same input always produces the
 * same id, so pushing the same local row twice is a harmless upsert, not a
 * duplicate insert. Collision risk is negligible at personal fitness-log
 * volumes (thousands of rows per user, not billions).
 *
 * This is what makes push idempotent for exercise_logs/pr_history without
 * ever storing a sync id in local storage — the id is re-derived from the
 * row's own content (user + exercise + date + weight + sets + reps) every
 * time, on both the push side and the dedup-on-merge side.
 */
function hash64(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

export function deterministicId(...parts) {
  const key = parts.join("|");
  const hex = (hash64(key) + hash64(key + "::salt")).padEnd(32, "0").slice(0, 32);
  return (
    hex.slice(0, 8) + "-" +
    hex.slice(8, 12) + "-" +
    "4" + hex.slice(13, 16) + "-" +           // version 4
    "89ab"[parseInt(hex[16], 16) % 4] + hex.slice(17, 20) + "-" + // variant
    hex.slice(20, 32)
  );
}
