import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { I18nProvider } from "./hooks/useI18n";
import { ToastProvider } from "./hooks/useToast";
import { DialogProvider } from "./hooks/useDialog";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";

function RouteFallback() {
  // Lightweight, matches the glass aesthetic — shown only during lazy chunk loads.
  return <div className="bg-ambient" />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ToastProvider>
          <DialogProvider>
            <AuthProvider>
              <Suspense fallback={<RouteFallback />}>
                <RouterProvider router={router} />
              </Suspense>
            </AuthProvider>
          </DialogProvider>
        </ToastProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
