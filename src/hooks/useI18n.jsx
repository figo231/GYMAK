import { createContext, useContext, useMemo, useState, useEffect } from "react";
import Store from "../lib/store/gymakStore";

const I18nContext = createContext(null);

/* Replaces the old applyI18n() DOM-scanning approach (document.querySelectorAll("[data-i18n]"))
   with a normal React context. The translation dictionary itself, and Store.t(key), are untouched —
   only *how* components consume it changed, so every string is identical to the original. */
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(Store.getLang());

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      t: (key) => Store.t(key),
      setLang: (next) => {
        Store.setLang(next);
        setLangState(next);
        // Plain tx() calls live outside React's re-render reach (module-level
        // data normalisers, non-subscribed components), so a full reload is
        // the reliable way to repaint every screen in the new language.
        if (typeof window !== "undefined") window.location.reload();
      },
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
