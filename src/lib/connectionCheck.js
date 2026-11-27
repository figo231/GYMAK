// Short connection check for auth screens. Sends one anonymous GET to the public auth health URL.
// Returns a short code only. No keys, no user data, no response body.
export const isNetworkAuthError = (error) => !!error && !(typeof error.status === "number" && error.status >= 400) && (error.name === "AuthRetryableFetchError" || error instanceof TypeError || /failed to fetch|load failed|networkerror|network request/i.test(String(error.message || "")));

export async function checkConnection({ url = import.meta.env.VITE_SUPABASE_URL, fetchFn = (typeof fetch === "function" ? fetch : null), timeoutMs = 8000 } = {}) {
  const online = typeof navigator === "undefined" ? "?" : String(navigator.onLine);
  const sw = typeof navigator !== "undefined" && navigator.serviceWorker && navigator.serviceWorker.controller ? "sw" : "nosw";
  if (!url || !fetchFn) return `chk:nourl online=${online} ${sw}`;
  const started = Date.now();
  try {
    const res = await fetchFn(url.replace(/\/$/, "") + "/auth/v1/health", { method: "GET", cache: "no-store", signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined });
    return `chk:http${res.status} ${Date.now() - started}ms online=${online} ${sw}`;
  } catch (e) {
    return `chk:${(e && e.name) || "error"} ${Date.now() - started}ms online=${online} ${sw}`;
  }
}
