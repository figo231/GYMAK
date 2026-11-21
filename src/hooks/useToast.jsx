import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  // opts.action = { label, onClick } adds a button (used for "undo").
  const showToast = useCallback((message, { duration = 2600, action } = {}) => {
    const id = ++idCounter;
    setToasts((list) => [...list, { id, message, action }]);
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
          <div className="toast" key={t.id} style={t.action ? { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } : undefined}>
            <span>{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action.onClick(); dismiss(t.id); }}
                style={{ background: "none", border: "none", color: "var(--accent-text, #D7FF2F)", fontWeight: 900, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
              >{t.action.label}</button>
            )}
          </div>
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
