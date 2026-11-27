// Display translation for inline Arabic source strings.
// The Arabic text itself is the dictionary key, so call sites stay readable
// and untranslated strings fall back to the Arabic source untouched.
import { getLang } from "./lang";
import { EN } from "./en";
import { EN_EXTRA } from "./enExtra";

export function tx(ar) {
  if (ar == null) return ar;
  if (getLang() !== "en") return ar;
  return EN[ar] || EN_EXTRA[ar] || ar;
}

// Interpolated variant: txf("فاضل {0} يوم", [n]) -> "3 days left".
export function txf(ar, vars) {
  let s = tx(ar);
  if (vars) vars.forEach((v, i) => { s = s.split("{" + i + "}").join(String(v)); });
  return s;
}
