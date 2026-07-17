import { createContext, useCallback, useContext, useRef, useState } from "react";

const DialogContext = createContext(null);

/* Single provider backing two hooks: usePrompt() (replaces window.prompt) and
   useConfirm() (replaces window.confirm). Both original behaviors are preserved —
   Promise resolves to the typed value / true on confirm, or null on cancel —
   so call sites read almost identically to before, just with `await`. */
export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { kind, title, label, placeholder, defaultValue, inputType, confirmLabel, cancelLabel, danger }
  const resolver = useRef(null);
  const [value, setValue] = useState("");

  const close = useCallback((result) => {
    setDialog(null);
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  }, []);

  const promptAsync = useCallback((opts) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setValue(opts.defaultValue != null ? String(opts.defaultValue) : "");
      setDialog({ kind: "prompt", confirmLabel: "حفظ", cancelLabel: "إلغاء", inputType: "text", ...opts });
    });
  }, []);

  const confirmAsync = useCallback((opts) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setDialog({ kind: "confirm", confirmLabel: "تأكيد", cancelLabel: "إلغاء", ...opts });
    });
  }, []);

  return (
    <DialogContext.Provider value={{ promptAsync, confirmAsync }}>
      {children}
      {dialog && (
        <div className="sheet-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) close(dialog.kind === "prompt" ? null : false); }}>
          <div className="glass sheet-panel">
            <div className="sheet-grip" />
            {dialog.title && <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px" }}>{dialog.title}</h3>}
            {dialog.label && <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 14px" }}>{dialog.label}</p>}
            {dialog.kind === "prompt" && (
              <input
                className="sheet-input"
                type={dialog.inputType}
                inputMode={dialog.inputType === "number" ? "decimal" : undefined}
                placeholder={dialog.placeholder}
                value={value}
                autoFocus
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") close(value); }}
              />
            )}
            <div className="sheet-actions">
              <button
                className="btn btn-secondary"
                onClick={() => close(dialog.kind === "prompt" ? null : false)}
              >
                {dialog.cancelLabel}
              </button>
              <button
                className="btn btn-primary"
                style={dialog.danger ? { background: "var(--danger)" } : undefined}
                onClick={() => close(dialog.kind === "prompt" ? value : true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

function useDialogContext() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("Dialog hooks must be used inside DialogProvider");
  return ctx;
}

/** Drop-in async replacement for window.prompt(message, defaultValue). */
export function usePrompt() {
  const { promptAsync } = useDialogContext();
  return promptAsync;
}

/** Drop-in async replacement for window.confirm(message). */
export function useConfirm() {
  const { confirmAsync } = useDialogContext();
  return confirmAsync;
}
