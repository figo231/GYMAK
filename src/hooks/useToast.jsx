import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const showToast = useCallback((message, { duration = 2600 } = {}) => {
    const id = ++idCounter;
    setToasts((list) => [...list, { id, message }]);
    timers.current[id] = setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
      delete timers.current[id];
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* Usage: const toast = useToast(); toast("تم الحفظ"); — direct swap-in for the old alert("تم الحفظ") calls. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
