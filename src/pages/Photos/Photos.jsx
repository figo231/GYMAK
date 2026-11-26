import { useCallback, useEffect, useRef, useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useDialog";
import { compressImageToBlob } from "../../lib/imageCompress";
import { drawBeforeAfter, canvasToBlob } from "../../lib/share/shareCard";
import { POSES, addPhoto, compareSet, deletePhoto, listPhotos } from "../../lib/photos/photos";
import { tx, txf } from "../../lib/i18n/tx";

function useUrls(photos) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    const m = {};
    photos.forEach((p) => { m[p.id] = URL.createObjectURL(p.blob); });
    setUrls(m);
    return () => Object.values(m).forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);
  return urls;
}
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export default function Photos() {
  const toast = useToast();
  const confirmAsync = useConfirm();
  const [photos, setPhotos] = useState([]);
  const [pose, setPose] = useState("front");
  const [filter, setFilter] = useState("front");
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);
  const camRef = useRef(null), galRef = useRef(null);
  const urls = useUrls(photos);

  const refresh = useCallback(async () => { try { setPhotos(await listPhotos()); } catch { toast(tx("مقدرناش نفتح الصور على الجهاز ده.")); } }, [toast]);
  useEffect(() => { refresh(); }, [refresh]);

  async function onPick(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        const blob = await compressImageToBlob(f, 1080, 0.8);
        await addPhoto(blob, { pose });
      }
      toast(tx("اتحفظت الصورة على جهازك ✅"));
      await refresh();
    } catch (err) {
      toast(err?.message === "photo-limit" ? tx("وصلت للحد الأقصى من الصور. امسح القديم الأول.") : tx("معرفناش نحفظ الصورة."));
    } finally { setBusy(false); }
  }
  async function del(p) {
    if (!(await confirmAsync({ title: tx("تمسح الصورة دي من الجهاز؟"), danger: true, confirmLabel: tx("مسح"), cancelLabel: tx("إلغاء") }))) return;
    try{await deletePhoto(p.id); setView(null); await refresh();}catch{toast(tx("معرفناش نمسح الصورة. جرّب تاني."));}
  }
  const cmp = compareSet(photos, filter);
  async function shareCmp() {
    if (!cmp) return;
    try {
      try { await document.fonts.load("700 40px GymakSans"); } catch { /* ignore */ }
      const [b, a] = await Promise.all([createImageBitmap(cmp.before.blob), createImageBitmap(cmp.after.blob)]);
      const c = drawBeforeAfter(document.createElement("canvas"), b, a, { sub: dayDiff(cmp.before.date, cmp.after.date) > 0 ? txf(`{0} يوم`, [dayDiff(cmp.before.date, cmp.after.date)]) : "" });
      const blob = await canvasToBlob(c);
      const file = new File([blob], "gymak-before-after.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
      const u = URL.createObjectURL(blob); const el = document.createElement("a"); el.href = u; el.download = file.name; el.click();
      setTimeout(() => URL.revokeObjectURL(u), 2000);
      toast(tx("اتحفظت الصورة على جهازك."));
    } catch (e) { if (!e || e.name !== "AbortError") toast(tx("معرفناش نعمل الصورة.")); }
  }
  return (
    <div className="ph-page">
      <SectionNav group="progress" title={tx("تقدّمي")} />
      <div className="ph-head">
        <div><h1>{tx("صور التقدم")}</h1><p>{photos.length ? txf(`{0} صورة على جهازك`, [photos.length]) : tx("صوّر أول صورة النهاردة")}</p></div>
        <span className="ph-lock">{tx("على جهازك بس")}</span>
      </div>

      {cmp && (
        <div className="ph-cmp">
          <div className="ph-cmp-top">
            <b>{tx("قبل وبعد")}</b>
            <span className="ph-delta">{dayDiff(cmp.before.date, cmp.after.date)} {tx("يوم")}</span>
          </div>
          <div className="ph-cmp-grid">
            {[[tx("قبل"), cmp.before], [tx("بعد"), cmp.after]].map(([lab, p]) => (
              <div key={p.id} className={txf(`ph-cmp-img {0}`, [lab === tx("قبل") ? "" : "after"])}>
                <img src={urls[p.id]} alt={lab} />
                <span className="ph-tag">{lab}</span>
                <span className="ph-date" dir="ltr">{p.date}</span>
              </div>
            ))}
          </div>
          <button type="button" className="btn ph-share" onClick={shareCmp}>{tx("شارك قبل وبعد")}</button>
        </div>
      )}

      <div className="ph-pose">
        {POSES.map(([k, l]) => <button key={k} type="button" className={pose === k ? "on" : ""} onClick={() => { setPose(k); setFilter(k); }}>{l}</button>)}
      </div>
      {photos.length >= 2 && !cmp && <p className="ph-hint">{tx("محتاج صورتين من نفس الوضع عشان نقارن.")}</p>}

      <div className="ph-add">
        <button type="button" className="ph-cam" disabled={busy} onClick={() => camRef.current?.click()}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
          {busy ? tx("بيحفظ...") : tx("تصوير")}
        </button>
        <button type="button" className="ph-gal" disabled={busy} onClick={() => galRef.current?.click()}>{tx("من المعرض")}</button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={onPick} />

      {photos.length === 0 ? (
        <div className="ph-empty"><div className="ph-ghost"><span /><span /><span /></div><p>{tx("لسه مفيش صور. صوّر أول صورة وقارن بعد كام أسبوع.")}</p></div>
      ) : (
        <>
          <div className="ph-sec">{tx("كل الصور")}</div>
          <div className="ph-grid">
            {photos.map((p) => (
              <button key={p.id} type="button" className="ph-thumb" onClick={() => setView(p)}>
                <img src={urls[p.id]} alt={p.date} loading="lazy" />
                <span dir="ltr">{p.date}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {view && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) setView(null); }}>
          <div className="edit-sheet" style={{ maxHeight: "92vh", overflowY: "auto" }}>
            <div className="edit-sheet-handle" />
            <img src={urls[view.id]} alt={view.date} style={{ width: "100%", borderRadius: 14 }} />
            <p className="notif-note" style={{ textAlign: "center" }}><span dir="ltr">{view.date}</span> · {POSES.find(([k]) => k === view.pose)?.[1]}</p>
            <div className="edit-sheet-actions">
              <button type="button" onClick={() => setView(null)}>{tx("إغلاق")}</button>
              <button type="button" onClick={() => del(view)} style={{ color: "#dc2626" }}>{tx("مسح")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}