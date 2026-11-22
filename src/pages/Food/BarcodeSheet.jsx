import { useEffect, useRef, useState } from "react";
import { validBarcode, lookupBarcode, itemFor, cameraScanSupported } from "../../lib/barcode";

const MSG = { invalid: "الرقم ده مش باركود صحيح. اتأكد من الأرقام.", notfound: "المنتج ده مش موجود في قاعدة البيانات. سجّله بالاسم أو دخّل القيم بإيدك.", network: "معرفناش نوصل للإنترنت. جرّب تاني." };

export default function BarcodeSheet({ onClose, onAdd }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [prod, setProd] = useState(null);
  const [grams, setGrams] = useState("100");
  const [cam, setCam] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function search(c = code) {
    if (busy) return;
    setErr(""); setProd(null);
    if (!validBarcode(c)) { setErr(MSG.invalid); return; }
    setBusy(true);
    const r = await lookupBarcode(c);
    setBusy(false);
    if (!r.ok) { setErr(MSG[r.error] || MSG.network); return; }
    setProd(r.product); setGrams(String(r.product.serving || 100));
  }

  useEffect(() => {
    if (!cam) return undefined;
    let stream, stop = false, timer;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a"] });
        const tick = async () => {
          if (stop) return;
          try {
            const found = await det.detect(videoRef.current);
            const hit = found.map((f) => validBarcode(f.rawValue)).find(Boolean);
            if (hit) { setCode(hit); setCam(false); search(hit); return; }
          } catch { /* keep scanning */ }
          timer = setTimeout(tick, 400);
        };
        tick();
      } catch { setCam(false); setErr("مقدرناش نفتح الكاميرا. اكتب رقم الباركود بإيدك."); }
    })();
    return () => { stop = true; clearTimeout(timer); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [cam]);

  const item = prod ? itemFor(prod, grams) : null;
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet" role="dialog" aria-modal="true" aria-label="باركود">
        <div className="edit-sheet-handle" />
        <h3>سجّل بالباركود</h3>
        {cam && <video ref={videoRef} className="bc-video" playsInline muted />}
        <div className="edit-field"><label htmlFor="bc-code">رقم الباركود (الأرقام اللي تحت الخطوط)</label>
          <input id="bc-code" dir="ltr" inputMode="numeric" value={code} maxLength={14} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></div>
        <div className="ad-actions">
          <button type="button" className="btn btn-primary" disabled={busy || code.length < 8} onClick={() => search()}>{busy ? "بندوّر..." : "دوّر"}</button>
          {cameraScanSupported() && <button type="button" className="btn" onClick={() => { setErr(""); setCam(!cam); }}>{cam ? "اقفل الكاميرا" : "افتح الكاميرا"}</button>}
        </div>
        {err && <div className="ct-err" role="alert">{err}</div>}
        {prod && (
          <div className="bc-result">
            <b>{prod.name}{prod.brand ? ` · ${prod.brand}` : ""}</b>
            <small>لكل 100 جم: {prod.per100.kcal} سعرة · بروتين {prod.per100.protein} · كارب {prod.per100.carbs} · دهون {prod.per100.fat}</small>
            <div className="edit-field"><label htmlFor="bc-g">الكمية اللي أكلتها (جم)</label>
              <input id="bc-g" type="number" inputMode="decimal" min="1" value={grams} onChange={(e) => setGrams(e.target.value)} /></div>
            {item ? <small>هتتسجل: {item.kcal} سعرة · بروتين {item.protein} · كارب {item.carbs} · دهون {item.fat}</small> : <small>اكتب كمية صحيحة.</small>}
            <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={!item} onClick={() => onAdd(item)}>سجّل</button>
          </div>
        )}
        <button type="button" className="btn" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>إلغاء</button>
        <p className="notif-note">البيانات من Open Food Facts وبتتجمّع من المستخدمين. ممكن تكون ناقصة أو مش دقيقة، وبعد التسجيل تقدر تعدّلها.</p>
      </div>
    </div>
  );
}
