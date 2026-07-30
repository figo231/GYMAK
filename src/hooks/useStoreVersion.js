import { useEffect, useState } from "react";
import Store from "../lib/store/gymakStore";

/**
 * Drop-in replacement for the `const [version, setVersion] = useState(0);
 * const refresh = () => setVersion((v) => v + 1);` pattern repeated across
 * pages (Dashboard, Profile, Exercises, ...).
 *
 * Behaves identically for local use (call the returned `refresh()` after a
 * mutation, same as before) — but ALSO subscribes to `Store.onChange()`,
 * which already fires on every `save()` call inside gymakStore.js, whether
 * that save came from a local mutation on this page or from syncManager
 * merging remote data pulled from Supabase. That second case is the one no
 * page was listening for before: a sync pull happening while a screen is
 * open used to update localStorage silently, with the UI only catching up
 * after a navigate-away-and-back remounted the page.
 *
 * gymakStore's public API is untouched — this only consumes the existing
 * onChange(fn) subscription hook that syncManager already relies on.
 *
 * @returns {[number, () => void]} [version, refresh] — same shape as the
 * useState(0) pattern it replaces.
 */
export function useStoreVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = Store.onChange(() => {
      setVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  const refresh = () => setVersion((v) => v + 1);

  return [version, refresh];
}
