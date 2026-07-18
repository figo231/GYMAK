import { useEffect, useState } from "react";
import UpdateService from "../lib/update/UpdateService";
import { useI18n } from "../hooks/useI18n";

// If the user doesn't tap "تحديث الآن", apply the update on their behalf
// after this long so a stale build can't linger indefinitely open.
const AUTO_RELOAD_AFTER_MS = 10 * 1000;

export default function PWAUpdatePrompt() {
  const { lang } = useI18n();
  const [needRefresh, setNeedRefresh] = useState(false);

  // UpdateService.init() is a one-time, app-lifetime singleton (guarded
  // internally), so mounting this more than once — or React StrictMode's
  // double-invoke in dev — is safe.
  useEffect(() => {
    UpdateService.init();
    const unsubscribe = UpdateService.subscribe((event) => {
      if (event.type === "available") setNeedRefresh(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!needRefresh) return undefined;
    // Guaranteed convergence even if the user never taps the button.
    const timer = setTimeout(() => applyUpdate(), AUTO_RELOAD_AFTER_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh]);

  function applyUpdate() {
    UpdateService.applyUpdate();
  }

  if (!needRefresh) return null;

  const text = lang === "en"
    ? { title: "A new version of GYMAK is available", action: "Update now" }
    : { title: "يتوفر إصدار جديد من GYMAK", action: "تحديث الآن" };

  return (
    <div className="pwa-update-toast" role="status" aria-live="polite">
      <span className="pwa-update-msg">{text.title}</span>
      <button type="button" className="pwa-update-btn" onClick={applyUpdate}>
        {text.action}
      </button>
    </div>
  );
}
