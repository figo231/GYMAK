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

const ONBOARD_KEY = "gymak_onboarded_v1";

function RouteFallback() {
  // Lightweight, matches the glass aesthetic — shown only during lazy chunk loads.
  return <div className="bg-ambient" />;
}

export default function App() {
  // Read once, before the router (and therefore Store.load()) ever runs, so
  // we can tell a genuinely brand-new install apart from an existing user
  // who simply hasn't seen the (new) onboarding flag yet. Existing local
  // users must never be walled behind onboarding/login — see ProtectedRoute.
  const [isNewInstall] = useState(() => !localStorage.getItem("gymak_state_v1"));
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem(ONBOARD_KEY) === "1" || !isNewInstall);
  const [showSplash, setShowSplash] = useState(true);

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
          <ToastProvider>
            <DialogProvider>
              <AuthProvider>
                <Suspense fallback={<RouteFallback />}>
                  <RouterProvider router={router} />
                </Suspense>
                {showSplash && <SplashScreen />}
                {!showSplash && !onboarded && <Onboarding onFinish={finishOnboarding} />}
              </AuthProvider>
            </DialogProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
