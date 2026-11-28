import { isEn } from "./lang";
// Locale for dates and numbers: follows the app language, not a fixed Arabic locale.
export function appLocale() { return isEn() ? "en-GB" : "ar-EG"; }
