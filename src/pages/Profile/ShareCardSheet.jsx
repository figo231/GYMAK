import { useEffect, useRef, useState } from "react";
import { drawCard, canvasToBlob } from "../../lib/share/shareCard";
import { useToast } from "../../hooks/useToast";

export default function ShareCardSheet({ data, name, onClose }) {
  const ref = useRef(null);
  const toast = useToast();
  const [url, setUrl] = useState("");
  useEffect(() => {
    let revoked = "";
    (async () => {
      const c = drawCard(document.createElement("canvas"), data, name);
      const blob = await canvasToBlob(c);
      revoked = URL.createObjectURL(blob);
      ref.current = blob;
      setUrl(revoked);
    })().catch(() => toast("مقدرناش نعمل الصورة."));
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [data, name, toast]);

  async function share() {
    const blob = ref.current; if (!blob) return;
    const file = new File([blob], "gymak-progress.png", { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = url; a.download = "gymak-progress.png"; a.click();
    toast("اتحفظت الصورة على جهازك.");
  }
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="edit-sheet-handle" />
        <h3>كارت التقدم</h3>
        {url ? <img src={url} alt="كارت التقدم" style={{ width: "100%", borderRadius: 14 }} /> : <p className="notif-note">بيجهز...</p>}
        <div className="edit-sheet-actions" style={{ marginTop: 12 }}>
          <button type="button" onClick={onClose}>إغلاق</button>
          <button type="button" className="primary" onClick={share} disabled={!url}>مشاركة / حفظ</button>
        </div>
      </div>
    </div>
  );
}
