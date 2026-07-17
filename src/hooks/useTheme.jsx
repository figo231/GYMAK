import { createContext, useContext, useEffect, useMemo, useState } from "react";

/* Theme preference is intentionally NOT stored via gymakStore/localStorage
   "gymak_..." app-state key — it's pure client UI preference, not app data,
   so it never touches the synced state shape or Supabase payloads.
   Own key, own concern. */
const STORAGE_KEY = "gymak_theme_pref"; // "light" | "dark" | "system"
const ThemeContext = createContext(null);

function getStoredPref() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark() {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }) {
  const [pref, setPref] = useState(getStoredPref); // user's chosen mode
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Track system changes live so "system" mode updates without reload.
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const resolved = pref === "system" ? (systemDark ? "dark" : "light") : pref;

  // Apply to <html data-theme="..."> — tokens.css keys off this attribute.
  useEffect(() => {
    const root = document.documentElement;
    if (pref === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", pref);
    }

    // Keep the PWA status-bar / task-switcher color in sync with the
    // resolved theme (mobile browsers read this on each change).
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#0B0E13" : "#F5F5F7");
  }, [pref, resolved]);

  const setTheme = (next) => {
    setPref(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private-browsing / storage disabled — in-memory state still works */
    }
  };

  const value = useMemo(() => ({ pref, theme: resolved, setTheme }), [pref, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
