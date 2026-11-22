import Store from "./lib/store/gymakStore";
import { isNative, syncMissedReminder } from "./lib/push/nativeReminder";
import { autoSnapshotIfDue } from "./lib/backup";
import { initializeOta } from "./lib/update/otaUpdateStrategy";
import { Suspense, useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { I18nProvider } from "./hooks/useI18n";
import { ToastProvider } from "./hooks/useToast";
import { DialogProvider } from "./hooks/useDialog";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import ErrorBoundary from "./components/ErrorBoundary";
import SplashScreen from "./components/SplashScreen";
import Onboarding from "./components/Onboarding";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";
import ApkUpdateSheet from "./components/ApkUpdateSheet";
import RestTimer from "./components/RestTimer";
import LockScreen from "./components/LockScreen";
import Celebration from "./components/Celebration";
import { isLockEnabled, shouldRelock } from "./lib/appLock";

const ONBOARD_KEY = "gymak_onboarded_v1";

function RouteFallback() {
  // Lightweight, matches the glass aesthetic — shown only during lazy chunk loads.
  return (
    <div className="app" aria-busy="true" aria-label="جاري التحميل">
      <div className="sk sk-head" />
      <div className="sk sk-card" style={{ height: 120 }} />
      <div className="sk sk-card" style={{ height: 150 }} />
      <div className="sk-row"><div className="sk sk-card" style={{ height: 90 }} /><div className="sk sk-card" style={{ height: 90 }} /><div className="sk sk-card" style={{ height: 90 }} /></div>
    </div>
  );
}

export default function App() {
  // Read once, before the router (and therefore Store.load()) ever runs, so
  // we can tell a genuinely brand-new install apart from an existing user
  // who simply hasn't seen the (new) onboarding flag yet. Existing local
  // users must never be walled behind onboarding/login — see ProtectedRoute.
  const [isNewInstall] = useState(() => !localStorage.getItem("gymak_state_v1"));
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARD_KEY) === "1" || !isNewInstall);
  const [showSplash, setShowSplash] = useState(true);
  const [locked, setLocked] = useState(() => isLockEnabled());

  useEffect(() => { initializeOta().catch(()=>{}); }, []);

  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (isNative()) { const trained = Store.trainedOn(); syncMissedReminder(Store.getReminderPrefs(), trained, !document.hidden); }
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (isLockEnabled() && shouldRelock(hiddenAt)) setLocked(true);
      hiddenAt = 0;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { autoSnapshotIfDue(); }, 8000);
    const onHide = () => { if (document.hidden) autoSnapshotIfDue(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", onHide); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1250);
    return () => clearTimeout(timer);
  }, []);

  function finishOnboarding() {
    localStorage.setItem(ONBOARD_KEY, "1");
    setOnboarded(true);
    // Brand-new installs land on the login/register flow after onboarding;
    // existing local (guest) users are completely unaffected by this screen.
    if (isNewInstall) {
      router.navigate("/auth/login");
    }
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <PWAUpdatePrompt />
          <ApkUpdateSheet />
          <ToastProvider>
            <DialogProvider>
              <AuthProvider>
                <Suspense fallback={<RouteFallback />}>
                  <RouterProvider router={router} />
                </Suspense>
                <RestTimer />
                <Celebration />
                {showSplash && <SplashScreen />}
                {locked && <LockScreen onUnlock={() => setLocked(false)} />}
                {!showSplash && !onboarded && <Onboarding onFinish={finishOnboarding} />}
              </AuthProvider>
            </DialogProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
