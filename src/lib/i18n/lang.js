// Framework-free language read, safe to import from anywhere (no React, no
// store cycle). The persisted app state owns the setting; we read it straight
// from storage so data-normalisation layers can localise at read time.
const KEY = "gymak_state_v1";

export function getLang() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return "ar";
    const s = JSON.parse(raw);
    return (s.settings && s.settings.lang) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

export function isEn() {
  return getLang() === "en";
}
