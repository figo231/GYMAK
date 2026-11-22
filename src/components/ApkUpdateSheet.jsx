import { useEffect, useState } from "react";
import UpdateService from "../lib/update/UpdateService";

export default function ApkUpdateSheet() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    UpdateService.init();
    return UpdateService.subscribe((e) => { if (e.type === "apk-available") setOpen(true); });
  }, []);

  if (!open) return null;

  async function go() {
    setBusy(true);
    setError("");
    try { await UpdateService.applyUpdate(); setOpen(false); }
    catch { setError("اتصل بالإنترنت وحاول تاني. تقدر تكمل استخدام التطبيق دلوقتي."); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop open" style={{ zIndex: 9999 }} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="edit-sheet">
        <div className="edit-sheet-handle" />
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ width: 54, height: 54, borderRadius: 18, margin: "0 auto 10px", display: "grid", placeItems: "center", background: "linear-gradient(135deg, var(--glow-blue), var(--glow-purple))", color: "var(--on-acc, #111)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></svg>
          </div>
          <h3 style={{ margin: "0 0 6px" }}>تحديث جديد للتطبيق</h3>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75, lineHeight: 1.7 }}>
            فيه نسخة أحدث من GYMAK جاهزة. دوس تحميل، وبعد ما يخلص افتح الملف واختار تثبيت. بياناتك هتفضل زي ما هي.
          </p>
        </div>
        {error && <p role="alert" style={{ fontSize: 13, textAlign: "center" }}>{error}</p>}
        <div className="edit-sheet-actions">
          <button type="button" onClick={() => setOpen(false)}>بعدين</button>
          <button type="button" onClick={go} disabled={busy} style={{ background: "linear-gradient(135deg, var(--glow-blue), var(--glow-purple))", color: "var(--on-acc, #111)" }}>تحديث</button>
        </div>
      </div>
    </div>
  );
}
